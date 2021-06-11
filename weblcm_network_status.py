import os
import sys
import cherrypy
from dbus.mainloop.glib import DBusGMainLoop
from gi.repository import GLib
import NetworkManager
from threading import Thread, Lock
from weblcm_settings import SystemSettingsManage
from syslog import syslog
from subprocess import Popen, PIPE, TimeoutExpired
import re

class NetworkStatusHelper(object):

	_network_status = {}
	_lock = Lock()
	_IW_PATH = "/usr/sbin/iw"

	@classmethod
	def get_reg_domain_info(cls):
		if not os.path.exists(NetworkStatusHelper._IW_PATH):
			return "WW"

		try:
			proc = Popen(["iw", "reg", "get"], stdout=PIPE, stderr=PIPE)
			outs, errs = proc.communicate(timeout=SystemSettingsManage.get_user_callback_timeout())
			if not proc.returncode:
				s = re.split('phy#', outs.decode("utf-8"))
				#Return regulatory domain of phy#0
				m = re.search('country [A-Z][A-Z]', s[1] if len(s) > 1 else s[0])
				if m:
					return m.group(0)[8:10]
		except TimeoutExpired:
			proc.kill()
			outs, errs = proc.communicate()
			syslog(LOG_ERR, "Call 'iw reg get' timeout")
		except Exception as e:
			syslog(LOG_ERR, "Call 'iw reg get' failed")

		return "WW"

	@classmethod
	def get_frequency_info(cls, interface, frequency):
		if not os.path.exists(NetworkStatusHelper._IW_PATH):
			return frequency
		try:
			proc = Popen(["iw", "dev"], stdout=PIPE, stderr=PIPE)
			outs, errs = proc.communicate(timeout=SystemSettingsManage.get_user_callback_timeout())
			if not proc.returncode:
				ifces = re.split('Interface', outs.decode("utf-8"))
				for ifce in ifces:
					lines = ifce.splitlines()
					if (lines[0].strip() != interface) or (len(lines) < 7):
						continue
					m = re.search('[2|5][0-9]{3}', lines[6])
					if m:
						return m.group(0)
		except TimeoutExpired:
			proc.kill()
			outs, errs = proc.communicate()
			syslog(LOG_ERR, "Call 'iw dev' timeout")
		except Exception as e:
			syslog(LOG_ERR, "Call 'iw dev' failed")

		return frequency

	@classmethod
	def get_dev_status(cls, dev):
		status = {}
		status['State'] = dev.State
		status['Mtu'] = dev.Mtu
		status['DeviceType'] = dev.DeviceType
		return status

	@classmethod
	def get_ipv4_properties(cls, ipv4):

		ip4Properties = {}
		if not ipv4:
			return ip4Properties

		addresses = {}
		i = 0
		for addr in ipv4.Addresses:
			addresses[i] = str(addr[0]) + "/" + str(addr[1])
			i += 1
		ip4Properties['Addresses'] = addresses

		routes = {}
		i = 0
		for rt in ipv4.Routes:
			routes[i] = str(rt[0]) + "/" + str(rt[1]) + " metric " + str(rt[3])
			i += 1
		ip4Properties['Routes'] = routes

		ip4Properties['Gateway'] = ipv4.Gateway

		i = 0
		domains = {}
		for dns in ipv4.Domains:
			domains[i] = str(dns)
			i += 1
		ip4Properties['Domains'] = domains

		return ip4Properties

	@classmethod
	def get_ipv6_properties(cls, ipv6):

		ip6Properties = {}
		if not ipv6:
			return ip6Properties

		addresses = {}
		i = 0
		for addr in ipv6.Addresses:
			addresses[i] = str(addr[0]) + "/" + str(addr[1])
			i += 1
		ip6Properties['Addresses'] = addresses

		routes = {}
		i = 0
		for rt in ipv6.Routes:
			routes[i] = str(rt[0]) + "/" + str(rt[1]) + " metric " + str(rt[3])
			i += 1
		ip6Properties['Routes'] = routes

		ip6Properties['Gateway'] = ipv6.Gateway

		i = 0
		domains = {}
		for dns in ipv6.Domains:
			domains[i] = str(dns)
			i += 1
		ip6Properties['Domains'] = domains

		return ip6Properties

	@classmethod
	def get_ap_properties(cls, ap, dev):

		apProperties = {}
		apProperties['Ssid'] = ap.Ssid
		apProperties['HwAddress'] = ap.HwAddress
		apProperties['Maxbitrate'] = ap.MaxBitrate
		apProperties['Flags'] = ap.Flags
		apProperties['Wpaflags'] = ap.WpaFlags
		apProperties['Rsnflags'] = ap.RsnFlags
		#Use iw dev to get channel/frequency info for AP mode
		if dev.Mode == NetworkManager.NM_802_11_MODE_AP:
			apProperties['Strength'] = 100
			apProperties['Frequency'] = cls.get_frequency_info(dev.Interface, ap.Frequency)
		else:
			apProperties['Strength'] = ap.Strength
			apProperties['Frequency'] = ap.Frequency
		return apProperties

	@classmethod
	def get_wifi_properties(cls, dev):
		wireless = {}
		wireless['Bitrate'] = dev.Bitrate
		wireless['HwAddress'] = dev.HwAddress
		wireless['PermHwAddress'] = dev.PermHwAddress
		wireless['Mode'] = dev.Mode
		wireless['LastScan'] = dev.LastScan
		return wireless

	@classmethod
	def get_wired_properties(cls, dev):
		wired = {}
		wired['HwAddress'] = dev.HwAddress
		wired['PermHwAddress'] = dev.PermHwAddress
		wired['Speed'] = dev.Speed
		wired['Carrier'] = dev.Carrier
		return wired

	@classmethod
	def network_status_query(cls):

		with cls._lock:
			devices = NetworkManager.NetworkManager.GetDevices()
			for dev in devices:

				#Dont add unmanaged devices
				if(dev.State == NetworkManager.NM_DEVICE_STATE_UNMANAGED):
					continue;

				interface_name = dev.Interface
				cls._network_status[interface_name] = {}

				cls._network_status[interface_name]['status'] = cls.get_dev_status(dev)

				if dev.State == NetworkManager.NM_DEVICE_STATE_ACTIVATED:
					settings = dev.ActiveConnection.Connection.GetSettings();
					cls._network_status[interface_name]['connection_active'] = settings['connection']
					cls._network_status[interface_name]['ip4config'] = cls.get_ipv4_properties(dev.Ip4Config)
					cls._network_status[interface_name]['ip6config'] = cls.get_ipv6_properties(dev.Ip6Config)

				#Get wired specific items
				if dev.DeviceType == NetworkManager.NM_DEVICE_TYPE_ETHERNET:
					cls._network_status[interface_name]['wired'] = cls.get_wired_properties(dev)

				#Get Wifi specific items
				if dev.DeviceType == NetworkManager.NM_DEVICE_TYPE_WIFI:
					cls._network_status[interface_name]['wireless'] = cls.get_wifi_properties(dev)
					if (dev.State == NetworkManager.NM_DEVICE_STATE_ACTIVATED):
						cls._network_status[interface_name]['activeaccesspoint'] = cls.get_ap_properties(dev.ActiveAccessPoint, dev)


def dev_added(nm, interface, signal, device_path):
	with NetworkStatusHelper._lock:
		NetworkStatusHelper._network_status[device_path.Interface] = {}
		NetworkStatusHelper._network_status[device_path.Interface]['status'] = NetworkStatusHelper.get_dev_status(device_path)

def dev_removed(nm, interface, signal, device_path):
	with NetworkStatusHelper._lock:
		NetworkStatusHelper._network_status.pop(device_path.Interface, None)

def ap_propchange(ap, interface, signal, properties):
		if 'Strength' in properties:
			for k in NetworkStatusHelper._network_status:
				if NetworkStatusHelper._network_status[k].get('activeaccesspoint', None):
					if NetworkStatusHelper._network_status[k]['activeaccesspoint'].get('Ssid') == ap.Ssid:
						with NetworkStatusHelper._lock:
							NetworkStatusHelper._network_status[k]['activeaccesspoint']['Strength'] = properties['Strength']

def dev_statechange(dev, interface, signal, new_state, old_state, reason):
	if dev.Interface not in NetworkStatusHelper._network_status:
		NetworkStatusHelper._network_status[dev.Interface] = {}

	with NetworkStatusHelper._lock:
		if new_state == NetworkManager.NM_DEVICE_STATE_ACTIVATED:
			NetworkStatusHelper._network_status[dev.Interface]['status'] = NetworkStatusHelper.get_dev_status(dev)
			settings = dev.ActiveConnection.Connection.GetSettings();
			NetworkStatusHelper._network_status[dev.Interface]['connection_active'] = settings['connection']
			NetworkStatusHelper._network_status[dev.Interface]['ip4config'] = NetworkStatusHelper.get_ipv4_properties(dev.Ip4Config)
			NetworkStatusHelper._network_status[dev.Interface]['ip6config'] = NetworkStatusHelper.get_ipv6_properties(dev.Ip6Config)
			if dev.DeviceType == NetworkManager.NM_DEVICE_TYPE_ETHERNET:
				NetworkStatusHelper._network_status[dev.Interface]['wired'] = NetworkStatusHelper.get_wired_properties(dev)
			if dev.DeviceType == NetworkManager.NM_DEVICE_TYPE_WIFI:
				NetworkStatusHelper._network_status[dev.Interface]['wireless'] = NetworkStatusHelper.get_wifi_properties(dev)
				NetworkStatusHelper._network_status[dev.Interface]['activeaccesspoint'] = NetworkStatusHelper.get_ap_properties(dev.ActiveAccessPoint, dev)
				dev.ActiveAccessPoint.OnPropertiesChanged(ap_propchange)
		elif new_state == NetworkManager.NM_DEVICE_STATE_DISCONNECTED:
			if 'ip4config' in NetworkStatusHelper._network_status[dev.Interface]:
				NetworkStatusHelper._network_status[dev.Interface].pop('ip4config', None)
			if 'ip6config' in NetworkStatusHelper._network_status[dev.Interface]:
				NetworkStatusHelper._network_status[dev.Interface].pop('ip6config', None)
			if 'activeaccesspoint' in NetworkStatusHelper._network_status[dev.Interface]:
				NetworkStatusHelper._network_status[dev.Interface].pop('activeaccesspoint', None)
			if 'connection_active' in NetworkStatusHelper._network_status[dev.Interface]:
				NetworkStatusHelper._network_status[dev.Interface].pop('connection_active', None)
		elif new_state == NetworkManager.NM_DEVICE_STATE_UNAVAILABLE:
			if 'wired' in NetworkStatusHelper._network_status[dev.Interface]:
				NetworkStatusHelper._network_status[dev.Interface].pop('wired', None)
			if 'wireless' in NetworkStatusHelper._network_status[dev.Interface]:
				NetworkStatusHelper._network_status[dev.Interface].pop('wireless', None)
		NetworkStatusHelper._network_status[dev.Interface]['status']['State'] = new_state

def run_event_listener():

	NetworkStatusHelper.network_status_query()

	NetworkManager.NetworkManager.OnDeviceAdded(dev_added)
	NetworkManager.NetworkManager.OnDeviceRemoved(dev_removed)

	for dev in NetworkManager.Device.all():
		if dev.DeviceType in (NetworkManager.NM_DEVICE_TYPE_ETHERNET, NetworkManager.NM_DEVICE_TYPE_WIFI, NetworkManager.NM_DEVICE_TYPE_MODEM):
			dev.OnStateChanged(dev_statechange)
		#In case wifi connection is already activated
		if dev.DeviceType == NetworkManager.NM_DEVICE_TYPE_WIFI and dev.ActiveAccessPoint:
			dev.ActiveAccessPoint.OnPropertiesChanged(ap_propchange)

	GLib.MainLoop().run()

@cherrypy.expose
class NetworkStatus(object):

	DBusGMainLoop(set_as_default=True)

	def __init__(self):

		t = Thread(target=run_event_listener, daemon=True)
		t.start()

	@cherrypy.tools.json_out()
	def GET(self, *args, **kwargs):
		result = { 'SDCERR': 0 }

		with NetworkStatusHelper._lock:
			result['status'] = NetworkStatusHelper._network_status

		devices = NetworkManager.NetworkManager.GetDevices()
		for dev in devices:
			if dev.DeviceType == NetworkManager.NM_DEVICE_TYPE_WIFI:
				result['status'][dev.Interface]['RegDomain'] = NetworkStatusHelper.get_reg_domain_info();

		unmanaged_devices = cherrypy.request.app.config['weblcm'].get('unmanaged_hardware_devices', '').split()
		for dev in unmanaged_devices:
			if dev in result['status']:
				del result['status'][dev]
		result['devices'] = len(result['status'])
		return result

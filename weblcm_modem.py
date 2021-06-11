import cherrypy
import dbus
import os
import sys
import time
from syslog import syslog
from xml.etree import ElementTree
from weblcm_def import WEBLCM_ERRORS

def dbus_to_python(data):
	#convert dbus data types to python native data types
	if isinstance(data, dbus.String):
		data = str(data)
	elif isinstance(data, dbus.Boolean):
		data = bool(data)
	elif isinstance(data, dbus.Int64):
		data = int(data)
	elif isinstance(data, dbus.UInt32):
		data = int(data)
	elif isinstance(data, dbus.Double):
		data = float(data)
	elif isinstance(data, dbus.Array):
		data = [dbus_to_python(value) for value in data]
	elif isinstance(data, dbus.Dictionary):
		new_data = dict()
		for key in data.keys():
			new_key = dbus_to_python(key)
			new_data[str(new_key)] = dbus_to_python(data[key])
		data = new_data
	return data


class Modem(object):

	_bus = dbus.SystemBus()

	def get_modem_location_interface(self, bus):
		_mm_location = 'org.freedesktop.ModemManager1.Modem.Location'
		return self.get_modem_interface(bus, _mm_location)

	def get_modem_interface(self, bus, path):

		mm_service = 'org.freedesktop.ModemManager1'
		mm_path = '/org/freedesktop/ModemManager1/Modem'

		obj = bus.get_object(mm_service, mm_path)
		if obj:
			iface = dbus.Interface(obj, 'org.freedesktop.DBus.Introspectable')
			xml_string = iface.Introspect()
			for child in ElementTree.fromstring(xml_string):
				if child.tag == 'node':
					dev_path = '/'.join((mm_path, child.attrib['name']))
					dev_obj = bus.get_object(mm_service, dev_path)
					iface = dbus.Interface(dev_obj, path)
					return iface
		return None

@cherrypy.expose
class PositioningSwitch(Modem):

	_source = 0

	@cherrypy.tools.json_out()
	def GET(self, *args, **kwargs):
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_SUCCESS'),
			'positioning': PositioningSwitch._source
		}
		return result

	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def PUT(self):
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_FAIL')
		}

		try:
			post_data = cherrypy.request.json
			source = post_data.get('positioning', 0)
			if (PositioningSwitch._source != source) and (not source or not PositioningSwitch._source):
				iface = self.get_modem_location_interface(Modem._bus)
				if iface:
					iface.Setup(dbus.UInt32(source), False)
					PositioningSwitch._source = source
					result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')
		except dbus.exceptions.DBusException as e:
			syslog("Enable/disable positioning: DBUS failed %s" % e)
		except Exception as e:
			syslog("Enable/disable positioning failed: %s" % e)

		result['positioning'] = PositioningSwitch._source
		return result

@cherrypy.expose
class Positioning(Modem):

	@cherrypy.tools.json_out()
	def GET(self, *args, **kwargs):
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_FAIL')
		}

		try:
			iface = self.get_modem_location_interface(Modem._bus)
			if iface:
				data = iface.GetLocation()
				result['positioning'] = dbus_to_python(data)
				result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')
		except dbus.exceptions.DBusException as e:
			syslog("Get positioning data: DBUS failed %s" % e)
		except Exception as e:
			syslog("Get positioning data failed: %s" % e)

		return result

	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def PUT(self):
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_FAIL')
		}

		post_data = cherrypy.request.json
		token = post_data.get('token', 0)
		if not token:
			return result

		try:
			iface = self.get_modem_location_interface(Modem._bus)
			if iface:
				iface.InjectAssistanceData(bytearray(token.encode('utf-8')))
				result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')
		except dbus.exceptions.DBusException as e:
			syslog("Set token: DBUS failed %s" % e)
		except Exception as e:
			syslog("Set token failed: %s" % e)

		return result

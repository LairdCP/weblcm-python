import configparser
import json
import os
import select
import socket
import threading
from typing import Optional, Dict, io, List

import cherrypy
import dbus
import pyudev

from weblcm_bluetooth_plugin import BluetoothPlugin
from weblcm_tcp_connection import TcpConnection, firewalld_open_port, \
    firewalld_close_port, TCP_SOCKET_HOST, SOCK_TIMEOUT
from weblcm_ble import device_is_connected

""" AUTO_CONNECT allows clients to open a server port for a specific device, before that device
is actually present in the system.
"""
AUTO_CONNECT = False

# From https://github.com/julzhk/usb_barcode_scanner/blob/master/scanner.py
CHARMAP_LOWERCASE = {4: 'a', 5: 'b', 6: 'c', 7: 'd', 8: 'e', 9: 'f', 10: 'g', 11: 'h', 12: 'i', 13: 'j', 14: 'k',
                     15: 'l', 16: 'm', 17: 'n', 18: 'o', 19: 'p', 20: 'q', 21: 'r', 22: 's', 23: 't', 24: 'u', 25: 'v',
                     26: 'w', 27: 'x', 28: 'y', 29: 'z', 30: '1', 31: '2', 32: '3', 33: '4', 34: '5', 35: '6', 36: '7',
                     37: '8', 38: '9', 39: '0', 44: ' ', 45: '-', 46: '=', 47: '[', 48: ']', 49: '\\', 51: ';',
                     52: '\'', 53: '~', 54: ',', 55: '.', 56: '/'}
CHARMAP_UPPERCASE = {4: 'A', 5: 'B', 6: 'C', 7: 'D', 8: 'E', 9: 'F', 10: 'G', 11: 'H', 12: 'I', 13: 'J', 14: 'K',
                     15: 'L', 16: 'M', 17: 'N', 18: 'O', 19: 'P', 20: 'Q', 21: 'R', 22: 'S', 23: 'T', 24: 'U', 25: 'V',
                     26: 'W', 27: 'X', 28: 'Y', 29: 'Z', 30: '!', 31: '@', 32: '#', 33: '$', 34: '%', 35: '^', 36: '&',
                     37: '*', 38: '(', 39: ')', 44: ' ', 45: '_', 46: '+', 47: '{', 48: '}', 49: '|', 51: ':', 52: '"',
                     53: '~', 54: '<', 55: '>', 56: '?'}
CR_CHAR = 40
SHIFT_CHAR = 2
ERROR_CHARACTER = ''


class HidBarcodeScannerPlugin(BluetoothPlugin):
    def __init__(self):
        self.hid_connections: Dict[str, HidBarcodeScanner] = {}
        """Dictionary of devices by UUID and their associated HidBarcodeScanner connection,
        if any"""

    @property
    def device_commands(self) -> List[str]:
        return ['hidConnect', 'hidDisconnect']

    @property
    def adapter_commands(self) -> List[str]:
        return ['hidList']

    def ProcessDeviceCommand(self, bus, command, device_uuid: str, device: dbus.ObjectPath,
                             post_data):
        processed = False
        error_message = None
        if command == 'hidConnect':
            processed = True
            if device_uuid in self.hid_connections:
                error_message = f'device {device_uuid} already has hid connection on port ' \
                                f'{self.hid_connections[device_uuid].port}'
            else:
                hid_connection = HidBarcodeScanner()
                error_message = hid_connection.connect(bus, device_uuid, device, post_data)
                if not error_message:
                    self.hid_connections[device_uuid] = hid_connection
        elif command == 'hidDisconnect':
            processed = True
            if not device_uuid in self.hid_connections:
                error_message = f'device {device_uuid} has no hid connection'
            else:
                hid_connection = self.hid_connections.pop(device_uuid)
                hid_connection.disconnect(bus, device_uuid, post_data)
        return processed, error_message

    def ProcessAdapterCommand(self, bus, command, controller_name: str, adapter_obj:
                              dbus.ObjectPath, post_data) -> (bool, str, dict):
        processed = False
        error_message = None
        result = {}
        if command == 'hidList':
            processed = True
            result['HidConnections'] = [{'device': k, 'port': self.hid_connections[k].port} for
                                        k in self.hid_connections.keys()]
        return processed, error_message, result


class HidBarcodeScanner(TcpConnection):
    """Represent a BT HID barcode scanner connection with HID profile or HoG (BLE hid-over-gatt)
    profile and an associated TCP socket connection.
    """

    def __init__(self):
        self.recent_error: Optional[str] = None
        self.device_uuid: str = ''
        self.active_device_node: str = ''
        self.thread: Optional[threading.Thread] = None
        self.read_thread: Optional[threading.Thread] = None
        self._barcode_read_thread_count = 0
        self._terminate_read_thread = False
        self._stop_pipe_r, self._stop_pipe_w = os.pipe()
        context = pyudev.Context()
        self.monitor = pyudev.Monitor.from_netlink(context)
        self.monitor.filter_by(subsystem='hidraw')
        observer = pyudev.MonitorObserver(self.monitor, self.udev_event)
        observer.start()
        super().__init__()

    def udev_event(self, action, device):
        try:
            if action == 'add':
                if self.hid_device_get_bt_address(device.sys_path) == self.device_uuid:
                    self.thread = threading.Thread(target=self.barcode_scanner_read_thread,
                                                   name="barcode_scanner_read_thread", daemon=True,
                                                   args=(device.device_node,))
                    self.thread.start()
                    self.send_connected_state(True)
            elif action == 'remove':
                if self.active_device_node == device.device_node:
                    self.send_connected_state(False)
        except Exception as e:
            cherrypy.log("udev_event:" + str(e))
            self.tcp_connection_try_send(f'{{"Error": "{str(e)}"}}\n'.encode())

    def barcode_reader(self, dev_node: str):
        barcode_string_output = ''
        # barcode can have a 'shift' character; this switches the character set
        # from the lower to upper case variant for the next character only.
        CHARMAP = CHARMAP_LOWERCASE
        fd = os.open(dev_node, os.O_RDONLY)
        try:
            while True:
                stopping = self.check_reader_stopping(fd)
                if stopping:
                    return
                else:
                    read_bytes = os.read(fd, 8)
                    # step through returned character codes, ignore zeroes
                    for char_code in [element for element in read_bytes if element > 0]:
                        if char_code == CR_CHAR:
                            # all barcodes end with a carriage return
                            return barcode_string_output
                        if char_code == SHIFT_CHAR:
                            # use uppercase character set next time
                            CHARMAP = CHARMAP_UPPERCASE
                        else:
                            # if the charcode isn't recognized, use ?
                            barcode_string_output += CHARMAP.get(char_code, ERROR_CHARACTER)
                            # reset to lowercase character map
                            CHARMAP = CHARMAP_LOWERCASE
        finally:
            os.close(fd)

    def check_reader_stopping(self, fd):
        stopping = False
        result = select.select([self._stop_pipe_r, fd], [], [])
        if self._stop_pipe_r in result[0]:
            os.close(self._stop_pipe_r)
            os.close(self._stop_pipe_w)
            stopping = True
        return stopping

    @staticmethod
    def hid_device_get_bt_address(device_path: str):
        path = device_path + '/device/uevent'
        config = configparser.ConfigParser()
        with open(path) as stream:
            try:
                config.read_string("[top]" + stream.read())
                if 'HID_UNIQ' in config['top']:
                    uniq_address = config['top']['HID_UNIQ'].strip('"')
                    # return the BT uniq_address
                    return uniq_address.upper()
                else:
                    return False
            except:
                return False

    def udev_find_hid_device(self, device_uuid):
        context = pyudev.Context()
        for device in context.list_devices(subsystem='hidraw'):
            if self.hid_device_get_bt_address(device.sys_path) == device_uuid.upper():
                return device.device_node
        return None

    def send_connected_state(self, connected_state):
        connected_packet = {'Connected': int(connected_state)}
        self.tcp_connection_try_send(
            (json.dumps(connected_packet) + '\n').encode())

    def connect(self, bus, device_uuid: str=None, device: dbus.ObjectPath=None,
                params=None):
        device_uuid = device_uuid.upper()
        if AUTO_CONNECT:
            self.device_uuid = device_uuid
        elif device:
            if not device_is_connected(bus, device):
                return f"Device {device_uuid} is not connected."

        # Note that for BT keyboard / scanner operation, kernel uhid module
        # must be available, and for BLE BlueZ must have HoG support

        # Find the hidraw device interface (bluez runs in userspace and thus must present
        # hid devices to the system through uhid) that corresponds to this BT device
        self.device_uuid = device_uuid
        hid_input_devname = self.udev_find_hid_device(device_uuid)

        if not AUTO_CONNECT and not hid_input_devname:
            return f"No HID keyboard service found for device {device_uuid}"

        # hid_input_devname will have the format /dev/hidrawN

        if not AUTO_CONNECT and not os.path.exists(hid_input_devname):
            return f"Cannot open hidraw devnode at {hid_input_devname}"

        if 'tcpPort' in params:
            port = params['tcpPort']
            if not self.validate_port(int(port)):
                return f"port {port} not valid"
            host = TCP_SOCKET_HOST  # cherrypy.server.socket_host
            self.sock = self.tcp_server(host, params)
            if self.sock:
                self.thread = threading.Thread(target=self.hid_tcp_server_thread,
                                               name="hid_tcp_server_thread", daemon=True,
                                               args=(self.sock, port))
                self.thread.start()
                if hid_input_devname and not self._barcode_read_thread_count:
                    self.read_thread = threading.Thread(target=self.barcode_scanner_read_thread,
                                                        name="barcode_scanner_read_thread",
                                                        daemon=True,
                                                        args=(hid_input_devname,))
                    self.read_thread.start()
        else:
            return 'tcpPort param not specified'

    def disconnect(self, bus, device_uuid: str = None, params=None):
        if self.read_thread:
            self._terminate_read_thread = True
            self.stop_read_thread()
            self.read_thread.join()
        self.stop_tcp_server(self.sock)
        if self.thread:
            self.thread.join()

    def stop_read_thread(self):
        os.write(self._stop_pipe_w, b'c')

    def barcode_scanner_read_thread(self, infile_path: str):
        self._barcode_read_thread_count += 1
        self.active_device_node = infile_path
        try:
            while not self._terminate_read_thread:
                barcode = self.barcode_reader(infile_path)
                if not self._terminate_read_thread:
                    barcode_packet = {'Received': {'Barcode': barcode}}
                    packet_encode = (json.dumps(barcode_packet) + '\n').encode()
                    self.tcp_connection_try_send(packet_encode)

        except Exception as e:
            if type(e) is OSError and not os.path.exists(infile_path):
                self.send_connected_state(False)
            else:
                cherrypy.log("barcode_scanner_read_thread:" + str(e))
                self.tcp_connection_try_send(f'{{"Error": "{str(e)}"}}\n'.encode())
        finally:
            self._barcode_read_thread_count -= 1

    def hid_tcp_server_thread(self, sock, port=None):
        if port:
            firewalld_open_port(port)
        try:
            sock.settimeout(SOCK_TIMEOUT)
            while True:
                try:
                    tcp_connection, client_address = sock.accept()
                    with self._tcp_lock:
                        self._tcp_connection = tcp_connection
                    cherrypy.log(
                        "hid_tcp_server_thread: tcp client connected:" + str(client_address))
                    try:
                        # Wait on socket, such that closure will force exception and
                        # take us back to accept.
                        while self._tcp_connection.recv(16):
                            pass

                    except OSError as e:
                        # If sock is closed, exit.
                        if e.errno == socket.EBADF:
                            break
                        cherrypy.log("hid_tcp_server_thread:" + str(e))
                    except Exception as e:
                        cherrypy.log("hid_tcp_server_thread: non-OSError Exception: " + str(e))
                        self.tcp_connection_try_send(f'{{"Error": "{str(e)}"}}\n'.encode())
                    finally:
                        cherrypy.log(
                            "hid_tcp_server_thread: tcp client disconnected:" + str(client_address))
                        with self._tcp_lock:
                            self.close_tcp_connection()
                            self._tcp_connection, client_address = None, None
                except socket.timeout:
                    continue
                except OSError as e:
                    # If the socket was closed by another thread, exit
                    if e.errno == socket.EBADF:
                        break
                    else:
                        raise
        finally:
            sock.close()
            self._tcp_connection, client_address = None, None
            if port:
                firewalld_close_port(port)
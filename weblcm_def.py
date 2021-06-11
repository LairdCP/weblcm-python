import os

WEBLCM_PYTHON_VERSION = '1.0.0.0'

SYSTEM_CONF_DIR = '/data/'
NETWORKMANAGER_CONF_DIR = '/data/secret/NetworkManager/'
WEBLCM_PYTHON_CONF_DIR = '/data/secret/weblcm-python/'
#weblcm-python.ini is for server config. It should be updated only by software update.
WEBLCM_PYTHON_SERVER_CONF_FILE = '/etc/weblcm-python/weblcm-python.ini'
#system settings
WEBLCM_PYTHON_SETTINGS_FILE = '/data/secret/weblcm-python/weblcm-settings.ini'

#timezone list
WEBLCM_PYTHON_ZONELIST = '/data/secret/weblcm-python/zonelist.db'

#Default system timezone datebase can be readonly. Save customer files in /data/misc/.
WEBLCM_PYTHON_ZONEINFO = '/data/misc/zoneinfo/'

WIFI_DRIVER_DEBUG_PARAM = '/sys/module/lrdmwl/parameters/lrd_debug'
#Change to ath6kl driver for wb50n
if not os.path.exists(WIFI_DRIVER_DEBUG_PARAM):
	WIFI_DRIVER_DEBUG_PARAM = "/sys/module/ath6kl_core/parameters/debug_mask"

FILEDIR_DICT = {
	'cert': '{0}{1}'.format(NETWORKMANAGER_CONF_DIR, 'certs/'),
	'pac': '{0}{1}'.format(NETWORKMANAGER_CONF_DIR, 'certs/'),
	'config': SYSTEM_CONF_DIR,
	'timezone': WEBLCM_PYTHON_ZONEINFO,
}

FILEFMT_DICT = {
	'cert' : ('crt', 'key', 'pem', 'bin'),
	'pac' : ('pac'),
}

DBUS_PROP_IFACE = 'org.freedesktop.DBus.Properties'
WPA_OBJ = '/fi/w1/wpa_supplicant1'
WPA_IFACE =	'fi.w1.wpa_supplicant1'

WEBLCM_ERRORS = {
	'SDCERR_SUCCESS': 0,
	'SDCERR_FAIL': 1,
	'SDCERR_USER_LOGGED': 2,
	'SDCERR_USER_BLOCKED': 3,
	'SDCERR_SESSION_CHECK_FAILED': 4,
	'SDCERR_FIRMWARE_UPDATING': 5,
}

USER_PERMISSION_TYPES = {
	'UserPermssionTypes':[
		"status_networking",
		"networking_connections",
		"networking_edit",
		"networking_activate",
		"networking_ap_activate",
		"networking_delete",
		"networking_scan",
		"networking_certs",
		"logging",
		"help_version",
		"system_datetime",
		"system_swupdate",
		"system_password",
		"system_advanced",
		"system_positioning",
		"system_reboot",
		#Root only permissions
		"system_user",
	],

	#Attributes to be displayed on the web
	'UserPermssionAttrs':[
		["Networking Status", "checked", "disabled"],
		["View Connections", "checked", "disabled"],
		["Edit Connection","", ""],
		["Activate Connection", "", ""],
		["Activate AP", "", ""],
		["Delete Connection", "", ""],
		["Wifi Scan","", ""],
		["Manage Certs","", ""],
		["Logging", "", ""],
		["Version", "checked", "disabled"],
		["Date & time","", ""],
		["Firmware Update", "", ""],
		["Update Password", "checked", "disabled"],
		["Advance Setting", "", ""],
		["Positioning", "", ""],
		["Reboot", "", ""],
		#Don't need to display root only permissions
		["", "", ""],
	],
}

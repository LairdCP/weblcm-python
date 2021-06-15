import os
import cherrypy
import weblcm_def
import logging
from weblcm_network_status import NetworkStatus
from weblcm_network import NetworkInterfaces, NetworkConnections, NetworkConnection, NetworkAccessPoints, Version
from weblcm_log import LogData, LogSetting
from weblcm_swupdate import SWUpdate
from weblcm_users import UserManage, LoginManage, LoginManageHelper
from weblcm_files import FileManage, FilesManage, AWMCfgManage
from weblcm_advanced import Reboot, FactoryReset
from weblcm_datetime import DateTimeSetting
from weblcm_settings import SystemSettingsManage
from weblcm_modem import PositioningSwitch, Positioning
from weblcm_advanced import Fips

class Root(object):

	_firewalld_disabled = os.system('systemctl is-active --quiet firewalld')

	@cherrypy.expose
	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_out()
	def definitions(self, *args, **kwargs):

		plugins = []
		for k in cherrypy.request.app.config['plugins']:
			plugins.append(k)

		settings = {}
		#Whether to display 'zone' on the 'edit connection' page
		settings['firewalld_disabled'] = Root._firewalld_disabled
		settings['session_timeout'] = SystemSettingsManage.get_session_timeout()

		return {
			'SDCERR': weblcm_def.WEBLCM_ERRORS,
			'PERMISSIONS': weblcm_def.USER_PERMISSION_TYPES,
			'PLUGINS': plugins,
			'SETTINGS': settings,
		}


#Redirect http to https
def force_tls():

	if cherrypy.request.scheme == "http":
		raise cherrypy.HTTPRedirect(cherrypy.url().replace("http:", "https:"), status=301)

def setup_http_server():

	httpServer = cherrypy._cpserver.Server()
	httpServer.socket_host = "::"
	httpServer.socket_port = 80
	httpServer.thread_pool = 0
	httpServer.subscribe()

	cherrypy.request.hooks.attach('on_start_resource', force_tls)

def force_session_checking():

	"""
		Raise HTTP 401 Unauthorized client error if a session with invalid id tries to assess following resources.
		HTMLs still can be loaded to keep consistency, i.e. loaded from local cache or remotely.
	"""

	paths = (
				"connections", "connection", "accesspoints", "networkInterfaces",
				"file", "users", "firmware", "logData", "awm", "positioning", "positioningSwitch",
				"logSetting", "factoryReset", "reboot", "files", "datetime", "fips"
			)

	#With the `get` method the session id will be saved which could result in session fixation vulnerability.
	#Session ids will be destroyed periodically so we have to check 'USERNAME' to make sure the session is not valid after logout.
	if not cherrypy.session._exists() or not cherrypy.session.get('USERNAME', None):
		url = cherrypy.url().split('/')[-1]
		if url and ".html" not in url and ".js" not in url and any(path in url for path in paths):
			raise cherrypy.HTTPError(401)

@cherrypy.tools.register('before_finalize', priority=60)
def secureheaders():
	headers = cherrypy.response.headers
	headers['X-Frame-Options'] = 'DENY'
	headers['X-XSS-Protection'] = '1; mode=block'
	headers['X-Content-Type-Options'] = 'nosniff'
	headers['Content-Security-Policy'] = "default-src 'self'"
	#Add Strict-Transport headers
	headers['Strict-Transport-Security'] = 'max-age=31536000'  # one year


if __name__ == '__main__':

	webapp = Root()

	webapp.login = LoginManage()

	webapp.networkStatus = NetworkStatus()
	webapp.connections = NetworkConnections()
	webapp.connection = NetworkConnection()
	webapp.accesspoints = NetworkAccessPoints()
	webapp.networkInterfaces = NetworkInterfaces()
	webapp.version = Version()

	webapp.logData = LogData()
	webapp.logSetting = LogSetting()

	webapp.users = UserManage()
	webapp.file = FileManage()
	webapp.files = FilesManage()
	webapp.awm = AWMCfgManage()

	webapp.firmware = SWUpdate()

	webapp.reboot = Reboot()
	webapp.factoryReset = FactoryReset()
	webapp.datetime = DateTimeSetting()

	webapp.positioningSwitch = PositioningSwitch()
	webapp.positioning = Positioning()

	webapp.fips = Fips()

	setup_http_server()

	logging.getLogger("cherrypy").propagate = False

	cherrypy.request.hooks.attach('before_handler', force_session_checking)

	#Server config
	cherrypy.config.update({
			'tools.sessions.timeout': SystemSettingsManage.get_session_timeout(),
		})

	cherrypy.quickstart(webapp, '/', config=weblcm_def.WEBLCM_PYTHON_SERVER_CONF_FILE)

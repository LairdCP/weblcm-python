import os
import cherrypy
import weblcm_def
import logging
from weblcm_network_status import NetworkStatus
from weblcm_network import NetworkInterfaces, NetworkConnections, NetworkConnection, NetworkAccessPoints, Version
from weblcm_log import LogData, LogSetting
from weblcm_swupdate import SWUpdate
from weblcm_users import UserManage, LoginManage, LogoutManage
from weblcm_files import FileManage, ArchiveFilesManage
from weblcm_advanced import Reboot, FactoryReset


class Root(object):

	@cherrypy.expose
	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_out()
	def definitions(self, *args, **kwargs):

		count = cherrypy.session.get('count', 0) + 1
		cherrypy.session['count'] = count

		return {
			'SDCERR': {
				'SDCERR_SUCCESS': 0,
				'SDCERR_FAIL': 1
			},
			'PLUGINS': {
				'usermanage': weblcm_def.USER_PERMISSION_TYPES
			},
		}


"""Redirect http to https"""
def force_tls():

	if cherrypy.request.scheme == "http":
		raise cherrypy.HTTPRedirect(cherrypy.url().replace("http:", "https:"), status=301)

def setup_http_server():

	httpServer = cherrypy._cpserver.Server()
	httpServer.socket_host = "0.0.0.0"
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
				"archiveFiles", "users", "firmware", "logData",
				"logSetting", "factoryReset", "reboot", "files"
			)

	if not cherrypy.session._exists():
		url = cherrypy.url().split('/')[-1]
		if url and ".html" not in url and any(path in url for path in paths):
			raise cherrypy.HTTPError(401)

if __name__ == '__main__':

	webapp = Root()

	webapp.login = LoginManage()
	webapp.logout = LogoutManage()

	webapp.networkStatus = NetworkStatus()
	webapp.connections = NetworkConnections()
	webapp.connection = NetworkConnection()
	webapp.accesspoints = NetworkAccessPoints()
	webapp.networkInterfaces = NetworkInterfaces()
	webapp.version = Version()

	webapp.logData = LogData()
	webapp.logSetting = LogSetting()

	webapp.users = UserManage()
	webapp.files = FileManage()
	webapp.archiveFiles = ArchiveFilesManage()

	webapp.firmware = SWUpdate()

	webapp.reboot = Reboot()
	webapp.factoryReset = FactoryReset()

	setup_http_server()

	logging.getLogger("cherrypy").propagate = False

	cherrypy.request.hooks.attach('before_handler', force_session_checking)

	#Server config
	cherrypy.config.update({
			'server.ssl_certificate': '{0}{1}'.format(weblcm_def.FILEDIR_DICT.get('cert'), 'server.crt'),
			'server.ssl_private_key': '{0}{1}'.format(weblcm_def.FILEDIR_DICT.get('cert'), 'server.key'),
		})

	cherrypy.quickstart(webapp, '/', config=weblcm_def.WEBLCM_PYTHON_SERVER_CONF_FILE)

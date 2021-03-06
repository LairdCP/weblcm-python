import cherrypy
from cherrypy.lib import httputil
import subprocess
import os,errno
import uuid
import hashlib
from threading import Lock
from datetime import datetime
import time
from weblcm_def import WEBLCM_ERRORS, USER_PERMISSION_TYPES
from weblcm_settings import WeblcmConfigManage, SystemSettingsManage

class UserManageHelper(object):

	@classmethod
	def verify(cls, username, password):
		if WeblcmConfigManage.get_key_from_section(username, 'salt', None):
			attempt = hashlib.sha256(WeblcmConfigManage.get_key_from_section(username, 'salt').encode() + password.encode()).hexdigest()
			return (attempt == WeblcmConfigManage.get_key_from_section(username, 'password', None))
		return False

	@classmethod
	def delUser(cls, username):
		if WeblcmConfigManage.remove_section(username):
			return WeblcmConfigManage.save()
		return False

	@classmethod
	def addUser(cls, username, password, permission=None):
		if WeblcmConfigManage.add_section(username):
			salt = uuid.uuid4().hex
			WeblcmConfigManage.upadte_key_from_section(username, 'salt', salt)
			WeblcmConfigManage.upadte_key_from_section(username, 'password', hashlib.sha256(salt.encode() + password.encode()).hexdigest())
			if permission:
				WeblcmConfigManage.upadte_key_from_section(username, 'permission', permission)
			return WeblcmConfigManage.save()
		return False

	@classmethod
	def updatePassword(cls, username, password):
		if WeblcmConfigManage.get_key_from_section(username, 'salt', None):
			salt = uuid.uuid4().hex
			WeblcmConfigManage.upadte_key_from_section(username, 'salt', salt)
			WeblcmConfigManage.upadte_key_from_section(username, 'password', hashlib.sha256(salt.encode() + password.encode()).hexdigest())
			return WeblcmConfigManage.save()
		return False

	@classmethod
	def getPermission(cls, username):
		return WeblcmConfigManage.get_key_from_section(username, 'permission', None)

	@classmethod
	def updatePermission(cls, username, permission):
		if permission and WeblcmConfigManage.get_key_from_section(username, 'permission', None):
			return WeblcmConfigManage.upadte_key_from_section(username, 'permission', permission)
		return False

	@classmethod
	def getNumberOfUsers(cls):
		''' All users including root '''
		return WeblcmConfigManage.get_section_size_by_key('password')

	@classmethod
	def getUserList(cls):
		userlist = WeblcmConfigManage.get_sections_and_key('permission')
		if userlist:
			#Default user shouldn't be listed as its permission can't be updated by weblcm
			default_username = cherrypy.request.app.config['weblcm'].get('default_username', "root")
			userlist.pop(default_username, None)
		return userlist

@cherrypy.expose
class UserManage(object):

	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def PUT(self):

		"""
			Update password/permission
		"""
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_FAIL'),
			'REDIRECT': 0,
		}

		post_data = cherrypy.request.json
		username = post_data.get('username', None)
		new_password = post_data.get('new_password', None)
		if new_password:
			current_password = post_data.get('current_password', None)
			if UserManageHelper.verify(username, current_password):
				if UserManageHelper.updatePassword(username, new_password):
					result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')
					#Redirect is required when the default password is updated
					default_username = cherrypy.request.app.config['weblcm'].get('default_username', "root")
					default_password = cherrypy.request.app.config['weblcm'].get('default_password', "summit")
					if current_password == default_password and username == default_username:
						result['REDIRECT'] = 1
		else:
			permission = post_data.get('permission', None)
			if permission:
				if UserManageHelper.updatePermission(username, permission):
					result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')

		return result

	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def POST(self):
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_FAIL'),
		}

		post_data = cherrypy.request.json
		username = post_data.get('username')
		password = post_data.get('password')
		permission = post_data.get('permission')

		if not username or not password or not permission:
			return result

		if UserManageHelper.getNumberOfUsers() < SystemSettingsManage.get_max_web_clients():
			if UserManageHelper.addUser(username, password, permission):
				result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')

		return result

	@cherrypy.tools.json_out()
	def DELETE(self, username):
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_FAIL'),
		}

		if UserManageHelper.delUser(username):
			result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')

		return result

	@cherrypy.tools.json_out()
	def GET(self, *args, **kwargs):
		return UserManageHelper.getUserList()

class LoginManageHelper(object):

	_lock = Lock()
	#Record logins with wrong credentials to protect against tamper
	_failed_logins = {}
	#Record successful logins and delete inactive sessions
	_sessions = {}
	@classmethod
	def is_user_blocked(cls, username):
		user = {}
		with cls._lock:
			now = datetime.now()
			user = cls._failed_logins.get(username)
			#Block username for 'login_block_timeout' seconds if failed consecutively for 'login_retry_times' times
			if user and len(user['time']) >= SystemSettingsManage.get_login_retry_times():
				dt = abs((now - user['time'][-1]).total_seconds())
				if dt < SystemSettingsManage.get_tamper_protection_timeout():
					return True
				cls._failed_logins.pop(username, None)
		return False

	@classmethod
	def login_failed(cls, username):
		with cls._lock:
			now = datetime.now()
			user = cls._failed_logins.get(username, {})
			if user:
				user['time'] = [ dt for dt in user['time'] if abs((now - dt).total_seconds()) < SystemSettingsManage.get_login_retry_window() ]
				if len(user['time']) >= SystemSettingsManage.get_login_retry_times():
					user['time'].pop(0, None)
			else:
				user['time'] = []

			user['time'].append(now)
			cls._failed_logins[username] = user

	@classmethod
	def login_reset(cls, username):
		with cls._lock:
			cls._failed_logins.pop(username, None)

	@classmethod
	def is_user_logged_in (cls, username):

		with cls._lock:

			temp_id = cherrypy.session.id
			for user, sid in cls._sessions.copy().items():
				cherrypy.session.id = sid
				if not cherrypy.session._exists():
					cls._sessions.pop(user, None)
			cherrypy.session.id = temp_id

			if cls._sessions.get(username, None):
				return True

			cls._sessions[username] = cherrypy.session.id
		return False

	@classmethod
	def delete (cls, username):
		cls._sessions.pop(username, None)

@cherrypy.expose
class LoginManage(object):

	@cherrypy.tools.json_in()
	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_out()
	def POST(self):
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_FAIL', 1),
			'REDIRECT': 0,
			'PERMISSION': "",
		}


		post_data = cherrypy.request.json
		username = post_data.get('username', "")
		password = post_data.get('password', "")

		#Return if username is blocked
		if not cherrypy.session.get('USERNAME', None):
			if LoginManageHelper.is_user_blocked(username):
				result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_USER_BLOCKED')
				return result

		default_username = cherrypy.request.app.config['weblcm'].get('default_username', "root")
		default_password = cherrypy.request.app.config['weblcm'].get('default_password', "summit")

		#If default password is not changed, redirect to passwd update page.
		if ((username == default_username) and (password == default_password)):

			cnt = UserManageHelper.getNumberOfUsers()
			if not cnt:
				UserManageHelper.addUser(username, password, " ".join(USER_PERMISSION_TYPES['UserPermssionTypes']))

			if not cnt or UserManageHelper.verify(default_username, default_password):

				LoginManageHelper.login_reset(username)
				if LoginManageHelper.is_user_logged_in(username):
					result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_USER_LOGGED')
					return result

				cherrypy.session['USERNAME'] = username
				result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')
				result['REDIRECT'] = 1
				return result

		#Session is created, but default password was not changed.
		if cherrypy.session.get('USERNAME', None) == default_username:
			if UserManageHelper.verify(default_username, default_password):
				result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')
				result['REDIRECT'] = 1
				return result

		#If session already exists, return success; otherwise verify login username and password.
		if not cherrypy.session.get('USERNAME', None):

			if not UserManageHelper.verify(username, password):
				LoginManageHelper.login_failed(username)
				return result

			LoginManageHelper.login_reset(username)

			if LoginManageHelper.is_user_logged_in(username):
				result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_USER_LOGGED')
				return result

			cherrypy.session['USERNAME'] = username

		result['PERMISSION'] = UserManageHelper.getPermission(cherrypy.session.get('USERNAME', None))
		#Don't display "system_user" page for single user mode
		if SystemSettingsManage.get_max_web_clients() == 1:
			result['PERMISSION'] = result['PERMISSION'].replace("system_user", "")

		result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')
		return result

	def DELETE(self):
		username = cherrypy.session.pop('USERNAME', None)
		if username:
			LoginManageHelper.delete(username)
		cherrypy.lib.sessions.expire()

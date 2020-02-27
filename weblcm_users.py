import cherrypy
import dbus
import subprocess
import os,errno
import uuid
import time
import hashlib
import configparser
import weblcm_def
import threading

passwords = configparser.ConfigParser(defaults=None)

@cherrypy.expose
class UserManage(object):

	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def PUT(self):
		result = {
			'SDCERR': 1,
			'REDIRECT': 0,
		}
		post_data = cherrypy.request.json
		username = cherrypy.session.get('USER')
		current_password = post_data.get('current_password')
		new_password = post_data.get('new_password')
		attempted_password = hashlib.sha256(passwords[username]['salt'].encode() + current_password.encode()).hexdigest()
		if attempted_password == passwords[username]['password'] and new_password:
			salt = uuid.uuid4().hex
			passwords[username]['salt'] = salt
			passwords[username]['salt'] = salt
			passwords[username]['password'] = hashlib.sha256(salt.encode() + new_password.encode()).hexdigest()
			with open(weblcm_def.WEBLCM_PYTHON_CONF_DIR + 'hash.ini', 'w') as configfile:
				passwords.write(configfile)
			if current_password == "summit" and username == "root":
				result['REDIRECT'] = 1
			result['SDCERR'] = 0

		return result

	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def POST(self):
		result = {
			'SDCERR': 1,
		}
		post_data = cherrypy.request.json
		session_username = cherrypy.session.get('USER')
		if session_username == "root":
			passwords.read(weblcm_def.WEBLCM_PYTHON_CONF_DIR + 'hash.ini')
			if(len(passwords.sections()) < cherrypy.request.app.config['weblcm']['max_web_clients']):
				username = post_data.get('username')
				password = post_data.get('password')
				if username and password and username not in passwords:
					passwords.add_section(username);
					salt = uuid.uuid4().hex
					passwords[username]['salt'] = salt
					passwords[username]['password'] = hashlib.sha256(salt.encode() + password.encode()).hexdigest()
					with open(weblcm_def.WEBLCM_PYTHON_CONF_DIR + 'hash.ini', 'w') as configfile:
						passwords.write(configfile)
					result['SDCERR'] = 0

		return result

	@cherrypy.tools.json_out()
	def DELETE(self, username):
		result = {
			'SDCERR': 1,
		}
		session_username = cherrypy.session.get('USER')
		if session_username == "root" and username != "root":
			passwords.read(weblcm_def.WEBLCM_PYTHON_CONF_DIR + 'hash.ini')
			if username in passwords:
				passwords.remove_section(username)
				with open(weblcm_def.WEBLCM_PYTHON_CONF_DIR + 'hash.ini', 'w') as configfile:
					passwords.write(configfile)
				result['SDCERR'] = 0

		return result

	@cherrypy.tools.json_out()
	def GET(self):
		result = []
		passwords.read(weblcm_def.WEBLCM_PYTHON_CONF_DIR + 'hash.ini')
		for k in passwords:
			result.append(k)

		return result[1:]

@cherrypy.expose
class LoginManage(object):

	@cherrypy.tools.json_in()
	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_out()
	def POST(self):
		result = {
			'SDCERR': 1,
			'REDIRECT': 0,
		}
		post_data = cherrypy.request.json
		passwords.read(weblcm_def.WEBLCM_PYTHON_CONF_DIR + 'hash.ini')
		if post_data.get('username') in passwords and post_data.get('password'):
			attempted_password = hashlib.sha256(passwords[post_data['username']]['salt'].encode() + post_data.get('password').encode()).hexdigest()
			if attempted_password == passwords[post_data['username']]['password']:
				cherrypy.session['USER'] = post_data.get('username')
				result['SDCERR'] = 0
				"""Redirect to password update page"""
				if post_data.get('password') == "summit" and post_data.get('username') == "root":
					result['REDIRECT'] = 1

		return result

@cherrypy.expose
class LogoutManage(object):

	@cherrypy.tools.json_in()
	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_out()
	def GET(self):
		result = {
			'SDCERR': 0,
		}
		cherrypy.session.pop('USER', None)
		cherrypy.lib.sessions.expire()
		return result

import cherrypy
from syslog import syslog
from subprocess import Popen, PIPE
from weblcm_def import WEBLCM_ERRORS, USER_PERMISSION_TYPES
from weblcm_settings import SystemSettingsManage

@cherrypy.expose
class Reboot(object):

	def PUT(self):
		p = Popen(['systemctl', 'reboot'])
		p.wait()
		return

@cherrypy.expose
class FactoryReset(object):
	FACTORY_RESET_SCRIPT='/usr/sbin/do_factory_reset.sh'

	@cherrypy.tools.json_out()
	def PUT(self):
		result = {
			'SDCERR': 1,
		}
		p = Popen([FactoryReset.FACTORY_RESET_SCRIPT, 'reset'])
		result['SDCERR'] = p.wait()
		return result

@cherrypy.expose
class Fips(object):

	FIPS_SCRIPT='/usr/bin/fips-set'

	@cherrypy.tools.accept(media='application/json')
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def PUT(self):
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_FAIL'),
		}

		post_data = cherrypy.request.json
		fips = post_data.get('fips', 0)
		proc = Popen([Fips.FIPS_SCRIPT, fips], stdout=PIPE, stderr=PIPE)
		try:
			outs, errs = proc.communicate(timeout=SystemSettingsManage.get_user_callback_timeout())
		except TimeoutExpired:
			proc.kill()
			outs, errs = proc.communicate()
			syslog("FIPS set timeout: %s" % e)
		except Exception as e:
			syslog("FIPS set exception: %s" % e)

		if not proc.returncode:
			result['SDCERR'] = WEBLCM_ERRORS.get('SDCERR_SUCCESS')
		else:
			syslog("FIPS set error: %s" % e)
		return result

	@cherrypy.tools.json_out()
	def GET(self,  *args, **kwargs):
		result = {
			'SDCERR': WEBLCM_ERRORS.get('SDCERR_SUCCESS'),
			'status': "unset"
		}

		proc = Popen([Fips.FIPS_SCRIPT, 'status'], stdout=PIPE, stderr=PIPE)
		try:
			outs, errs = proc.communicate(timeout=SystemSettingsManage.get_user_callback_timeout())
		except TimeoutExpired:
			proc.kill()
			outs, errs = proc.communicate()
			syslog("FIPS get timeout: %s" % e)
		except Exception as e:
			syslog("FIPS get exception: %s" % e)

		if not proc.returncode:
			result['status'] = outs.decode("utf-8").strip()
		else:
			syslog("FIPS get error: %s" % e)

		return result

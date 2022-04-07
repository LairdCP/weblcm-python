import os
from syslog import syslog
from subprocess import run
import cherrypy
from . import definition
from .settings import SystemSettingsManage
from .definition import WEBLCM_ERRORS, USER_PERMISSION_TYPES


@cherrypy.expose
class DateTimeSetting(object):
    DATE_TIME_SCRIPT = '/etc/weblcm-python/scripts/weblcm_datetime.sh'

    def popenHelper(self, method="", zone="", dt="") -> tuple[int, str, str]:

        try:
            proc = run([DateTimeSetting.DATE_TIME_SCRIPT, method, zone, dt],
                       capture_output=True,
                       timeout=SystemSettingsManage.get_user_callback_timeout())
        except:
            return (-1, '',  '')

        return (proc.returncode, proc.stdout.decode('utf-8'), proc.stderr.decode('utf-8'))

    def getZoneList(self):
        zones = []

        try:
            with open(definition.WEBLCM_PYTHON_ZONELIST, 'r') as fp:
                line = fp.readline()
                while line:
                    zones.append(line.strip())
                    line = fp.readline()
                fp.close()
            zones.sort()
        except Exception as e:
            syslog("Get Timezone list failure: %s" % e)

        return zones

    def __init__(self):

        self.localtime = "/etc/localtime"
        self.userZoneinfo = definition.WEBLCM_PYTHON_ZONEINFO
        self.userLocaltime = self.userZoneinfo + "localtime"
        self.zones = self.getZoneList()

    def getLocalZone(self):

        try:
            localtime = os.readlink(self.userLocaltime)
            index = localtime.find(self.zoneinfo)
            if -1 != index:
                return localtime[index + len(self.zoneinfo):]

            index = localtime.find(self.userZoneinfo)
            if -1 != index:
                return localtime[index + len(self.userZoneinfo):]
        except Exception as e:
            syslog(str(e))

    @cherrypy.tools.json_out()
    def GET(self, *args, **kwargs):

        result = {
            'SDCERR': WEBLCM_ERRORS.get('SDCERR_SUCCESS'),
            'InfoMsg': '',
        }

        result['zones'] = self.zones
        result['zone'] = self.getLocalZone()

        returncode, outs, errs = self.popenHelper("check", "", "")
        if returncode:
            result['method'] = "manual"
        else:
            result['method'] = "auto"
        result['time'] = outs

        return result

    @cherrypy.tools.accept(media='application/json')
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def PUT(self):

        result = {
            'SDCERR': WEBLCM_ERRORS.get('SDCERR_SUCCESS'),
            'InfoMsg': '',
        }

        zone = cherrypy.request.json.get('zone', "")
        method = cherrypy.request.json.get('method', "")
        dt = cherrypy.request.json.get('datetime', "")

        returncode, outs, errs = self.popenHelper(method, zone, dt)
        if returncode:
            result['message'] = errs
            result['InfoMsg'] = errs
            result['SDCERR'] = 1
            return result

        # Python datetime module returns system time only. Extra modules like dateutil etc. are
        # required to calculate the offset according to the timezone. So just get it from bash.
        returncode, outs, errs = self.popenHelper("check", "", "")
        result['time'] = outs
        result['SDCERR'] = 0
        result['InfoMsg'] = ''
        return result

import os
import subprocess
from threading import Lock
from syslog import syslog
import cherrypy
from cherrypy.lib import static
from . import definition
from .settings import SystemSettingsManage


@cherrypy.expose
class FileManage(object):

    """File Management"""

    _lock = Lock()
    FILE_MANAGE_SCRIPT = "/etc/weblcm-python/scripts/weblcm_files.sh"
    FILE_MANAGE_POST_ZIP_TYPES = ["config", "timezone"]

    # log will be saved in /var/run/log/journal/ for volatile mode, or /var/log/journal/ for persistent mode
    # If "/var/run/log/journal/" exists, it should be in volatile mode.
    _log_data_dir = "/var/run/log/journal/"
    if not os.path.exists("/var/run/log/journal/"):
        _log_data_dir = "/var/log/journal/"

    def save_file(self, typ, fil):
        path = os.path.normpath(
            os.path.join(definition.FILEDIR_DICT[typ], fil.filename)
        )
        try:
            with open(path, "wb+") as out:
                while True:
                    data = fil.file.read(8192)
                    if not data:
                        break
                    out.write(data)
            return path
        except:
            return None

    @cherrypy.tools.json_out()
    def POST(self, *args, **kwargs):
        result = {"SDCERR": definition.WEBLCM_ERRORS["SDCERR_FAIL"], "InfoMsg": ""}

        typ = kwargs.get("type", None)
        fil = kwargs.get("file", None)

        if not typ:
            syslog("FileManage POST - no type specified")
            result["InfoMsg"] = "file POST - no type specified"
            return result

        if not fil:
            syslog("FileManage POST - no filename provided")
            result["InfoMsg"] = "file POST - no filename specified"
            return result

        if typ not in definition.FILEDIR_DICT:
            syslog(f"FileManage POST type {typ} unknown")
            result["InfoMsg"] = f"file POST type {typ} unknown"  # bad request
            return result

        if typ in FileManage.FILE_MANAGE_POST_ZIP_TYPES and not fil.filename.endswith(
            ".zip"
        ):
            syslog(f"FileManage POST type not .zip file")
            result["InfoMsg"] = f"file POST type not .zip file"  # bad request
            return result

        with FileManage._lock:
            fp = self.save_file(typ, fil)
            if not fp:
                syslog(f"FileManage POST type failure to copy file")
                result["InfoMsg"] = f"file POST failure to copy file"  # bad request
                return result

            # Only attempt to unzip the uploaded file if the 'type' requires a zip file. Otherwise,
            # just saving the file is sufficient (i.e., for a certificate)
            if typ in FileManage.FILE_MANAGE_POST_ZIP_TYPES:
                password = kwargs.get("password", "")
                res = subprocess.call(
                    [
                        FileManage.FILE_MANAGE_SCRIPT,
                        typ,
                        "unzip",
                        fp,
                        definition.FILEDIR_DICT.get(typ),
                        password,
                    ]
                )
                os.remove(fp)
                if res:
                    syslog(f"unzip command file '{fp}' failed with error {res}")
                    result[
                        "InfoMsg"
                    ] = f"unzip command failed to unzip provided file.  Error returned: {res}"  # Internal server error
                    return result

            result["SDCERR"] = definition.WEBLCM_ERRORS["SDCERR_SUCCESS"]
            return result

        syslog(f"unable to obtain FileManage._lock")
        result[
            "InfoMsg"
        ] = "unable to obtain internal file lock"  # Internal server error
        return result

    def GET(self, *args, **kwargs):

        typ = kwargs.get("type", None)
        if not typ:
            syslog("FileManage Get - no filename provided")
            raise cherrypy.HTTPError(400, "no filename provided")

        fil = "{0}{1}".format(typ, ".zip")
        path = "{0}{1}".format("/tmp/", fil)

        if typ == "config":

            password = kwargs.get("password", None)
            if not password:
                syslog("FileManage Get - no password provided")
                raise cherrypy.HTTPError(400, "no password provided")
            args = [
                FileManage.FILE_MANAGE_SCRIPT,
                "config",
                "zip",
                definition.FILEDIR_DICT.get(typ),
                path,
                password,
            ]
            syslog("Configuration zipped for user")
        elif typ == "log":

            password = kwargs.get("password", None)
            if not password:
                syslog("FileManage Get - no password provided")
                raise cherrypy.HTTPError(400, "no password provided")
            args = [
                FileManage.FILE_MANAGE_SCRIPT,
                "log",
                "zip",
                FileManage._log_data_dir,
                path,
                password,
            ]
            syslog("System log zipped for user")

        elif typ == "debug":
            args = [
                FileManage.FILE_MANAGE_SCRIPT,
                "debug",
                "zip",
                " ".join([FileManage._log_data_dir, definition.FILEDIR_DICT["config"]]),
                path,
                SystemSettingsManage.get_cert_for_file_encryption(),
            ]
            syslog("Configuration and system log zipped/encrypted for user")
        else:
            syslog(f"FileManage GET - unknown file type {typ}")
            raise cherrypy.HTTPError(400, f"unknown file type {typ}")

        try:
            subprocess.call(args)
        except Exception as e:
            syslog("Script execution error {}".format(e))
            raise cherrypy.HTTPError(400, "Script execution error {}".format(e))

        if os.path.isfile(path):
            objFile = static.serve_file(
                path, "application/x-download", "attachment", fil
            )
            os.unlink(path)
            return objFile

        syslog(f"Failed to create file {path} for user")
        raise cherrypy.HTTPError(500, f"failed to create file {path}")

    @cherrypy.tools.json_out()
    def DELETE(self, *args, **kwargs):
        result = {
            "SDCERR": definition.WEBLCM_ERRORS["SDCERR_FAIL"],
            "InfoMsg": "Unable to delete file",
        }
        typ = kwargs.get("type", None)
        fil = kwargs.get("file", None)
        if not typ or not fil:
            if not typ:
                syslog("FileManage DELETE - no type specified")
                result["InfoMsg"] = "no type specified"
            if not fil:
                syslog("FileManage DELETE - no filename provided")
                result["InfoMsg"] = "no file specified"
            return result
        valid = ["cert", "pac"]
        if not typ in valid:
            result["InfoMsg"] = f"type not one of {valid}"
            return result
        path = os.path.normpath(os.path.join(definition.FILEDIR_DICT[typ], fil))
        if os.path.isfile(path):
            os.remove(path)
            if not os.path.exists(path):
                result["SDCERR"] = definition.WEBLCM_ERRORS["SDCERR_SUCCESS"]
                result["InfoMsg"] = f"file {fil} deleted"
                syslog(f"file {fil} deleted")
            else:
                syslog(f"Attempt to remove file {path} did not succeed")
        else:
            syslog(f"Attempt to remove non-existant file {path}")
            result["InfoMsg"] = f"File: {fil} not present"
        return result


@cherrypy.expose
class FilesManage(object):
    @cherrypy.tools.json_out()
    def GET(self, *args, **kwargs):
        result = {
            "SDCERR": definition.WEBLCM_ERRORS["SDCERR_SUCCESS"],
            "InfoMsg": "",
            "count": 0,
            "files": [],
        }
        typ = kwargs.get("type", None)
        valid = ["cert", "pac"]
        if not typ:
            result["SDCERR"] = definition.WEBLCM_ERRORS["SDCERR_FAIL"]
            result["InfoMsg"] = "no filename provided"
            return result
        if not typ in valid:
            result["InfoMsg"] = f"type not one of {valid}"
            result["SDCERR"] = definition.WEBLCM_ERRORS["SDCERR_FAIL"]
            return result

        files = []
        with os.scandir(definition.FILEDIR_DICT.get(typ)) as listOfEntries:
            for entry in listOfEntries:
                if entry.is_file():
                    strs = entry.name.split(".")
                    if len(strs) == 2 and strs[1] in definition.FILEFMT_DICT.get(typ):
                        files.append(entry.name)
        files.sort()
        result["files"] = files
        result["count"] = len(files)
        result["InfoMsg"] = f"{typ} files"
        return result

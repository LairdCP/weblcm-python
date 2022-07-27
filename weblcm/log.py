import os
from syslog import LOG_ERR, syslog
import cherrypy
import dbus
import time
from systemd import journal
from .definition import (
    LOG_FORWARDING_ENABLED_FLAG_FILE,
    SYSTEMD_BUS_NAME,
    SYSTEMD_MAIN_OBJ,
    SYSTEMD_MANAGER_IFACE,
    SYSTEMD_UNIT_ACTIVE_STATE_PROP,
    SYSTEMD_UNIT_IFACE,
    SYSTEMD_UNIT_UNIT_FILE_STATE_PROP,
    WEBLCM_ERRORS,
    WPA_IFACE,
    WPA_OBJ,
    WIFI_DRIVER_DEBUG_PARAM,
    DBUS_PROP_IFACE,
    SYSTEMD_JOURNAL_GATEWAYD_SOCKET_FILE,
)


@cherrypy.expose
class LogData(object):
    @cherrypy.tools.accept(media="application/json")
    @cherrypy.tools.json_out()
    def GET(self, *args, **kwargs):
        result = {"SDCERR": 0, "InfoMsg": ""}
        logs = []

        reader = journal.Reader()
        try:
            priority = int(kwargs.get("priority", 7))
        except Exception as e:
            syslog(
                LOG_ERR, f"Error parsing 'priority' parameter as an integer: {str(e)}"
            )
            return {"SDCERR": 1, "InfoMsg": "Priority must be an int between 0-7"}
        if priority not in range(0, 8, 1):
            return {"SDCERR": 1, "InfoMsg": "Priority must be an int between 0-7"}
        reader.log_level(priority)
        # use .lower() to ensure incoming type has comparable case
        typ = kwargs.get("type", "All").lower()
        # TODO - documentation says 'python' is lower case while others are upper/mixed case.
        if typ == "networkmanager":
            typ = "NetworkManager"
        elif typ == "all":
            typ = "All"
        elif typ == "python":
            typ = "weblcm-python"
        types = {
            "kernel",
            "NetworkManager",
            "weblcm-python",
            "adaptive_ww",
            "All",
        }
        if typ not in types:
            return {
                "SDCERR": 1,
                "InfoMsg": f"supplied type parameter must be one of {str(types)}",
            }
        if typ != "All":
            reader.add_match(SYSLOG_IDENTIFIER=typ)
        try:
            days = int(kwargs.get("days", 1))
        except Exception as e:
            syslog(LOG_ERR, f"Error parsing 'days' parameter as an integer: {str(e)}")
            return {"SDCERR": 1, "InfoMsg": "days must be an int"}
        if days > 0:
            reader.seek_realtime(time.time() - days * 86400)

        for entry in reader:
            log = {}
            log["time"] = str(entry.get("__REALTIME_TIMESTAMP", "Undefined"))
            log["priority"] = str(entry.get("PRIORITY", 7))
            log["identifier"] = entry.get("SYSLOG_IDENTIFIER", "Undefined")
            log["message"] = entry.get("MESSAGE", "Undefined")
            logs.append(log)

        result["InfoMsg"] = f"type: {typ}; days: {days}; Priority: {priority}"
        result["count"] = len(logs)
        result["log"] = logs
        reader.close()
        return result


@cherrypy.expose
class LogForwarding(object):
    @property
    def active_state(self) -> str:
        """
        The current 'ActiveState' value for the 'systemd-journal-gatewayd.socket' (log forwarding)
        service as a string. Possible values are:
        - active
        - reloading
        - inactive
        - failed
        - activating
        - deactivating
        - unknown (error state added by us)

        See below for more info:
        https://www.freedesktop.org/software/systemd/man/org.freedesktop.systemd1.html
        """
        try:
            bus = dbus.SystemBus()
            manager = dbus.Interface(
                bus.get_object(SYSTEMD_BUS_NAME, SYSTEMD_MAIN_OBJ),
                SYSTEMD_MANAGER_IFACE,
            )
            socket_unit_props = dbus.Interface(
                bus.get_object(
                    SYSTEMD_BUS_NAME,
                    manager.LoadUnit(SYSTEMD_JOURNAL_GATEWAYD_SOCKET_FILE),
                ),
                DBUS_PROP_IFACE,
            )
            active_state = socket_unit_props.Get(
                SYSTEMD_UNIT_IFACE, SYSTEMD_UNIT_ACTIVE_STATE_PROP
            )
            return active_state
        except Exception as e:
            syslog(
                LOG_ERR,
                f"Could not read 'ActiveState' of {SYSTEMD_JOURNAL_GATEWAYD_SOCKET_FILE}: {str(e)}",
            )
            return "unknown"

    @property
    def unit_file_state(self) -> str:
        """
        The current 'UnitFileState' value for the 'systemd-journal-gatewayd.socket' (log forwarding)
        service as a string. Possible values are:
        - enabled
        - enabled-runtime
        - linked
        - linked-runtime
        - masked
        - masked-runtime
        - static
        - disabled
        - invalid
        - unknown (error state added by us)

        See below for more info:
        https://www.freedesktop.org/software/systemd/man/org.freedesktop.systemd1.html
        """
        try:
            bus = dbus.SystemBus()
            manager = dbus.Interface(
                bus.get_object(SYSTEMD_BUS_NAME, SYSTEMD_MAIN_OBJ),
                SYSTEMD_MANAGER_IFACE,
            )
            socket_unit_props = dbus.Interface(
                bus.get_object(
                    SYSTEMD_BUS_NAME,
                    manager.LoadUnit(SYSTEMD_JOURNAL_GATEWAYD_SOCKET_FILE),
                ),
                DBUS_PROP_IFACE,
            )
            active_state = socket_unit_props.Get(
                SYSTEMD_UNIT_IFACE, SYSTEMD_UNIT_UNIT_FILE_STATE_PROP
            )
            return active_state
        except Exception as e:
            syslog(
                LOG_ERR,
                f"Could not read 'UnitFileState' of {SYSTEMD_JOURNAL_GATEWAYD_SOCKET_FILE}: {str(e)}",
            )
            return "unknown"

    @classmethod
    def activate(self) -> bool:
        """
        Activate the log forwarding service (systemd-journal-gatewayd.socket)
        """
        try:
            bus = dbus.SystemBus()
            manager = dbus.Interface(
                bus.get_object(SYSTEMD_BUS_NAME, SYSTEMD_MAIN_OBJ),
                SYSTEMD_MANAGER_IFACE,
            )
            manager.StartUnit(SYSTEMD_JOURNAL_GATEWAYD_SOCKET_FILE, "replace")
            return True
        except Exception as e:
            syslog(
                LOG_ERR,
                f"Could not activate the log forwarding service: {str(e)}",
            )
            return False

    @classmethod
    def deactivate(self) -> bool:
        """
        Deactivate the log forwarding service (systemd-journal-gatewayd.socket)
        """
        try:
            bus = dbus.SystemBus()
            manager = dbus.Interface(
                bus.get_object(SYSTEMD_BUS_NAME, SYSTEMD_MAIN_OBJ),
                SYSTEMD_MANAGER_IFACE,
            )
            manager.StopUnit(SYSTEMD_JOURNAL_GATEWAYD_SOCKET_FILE, "replace")
            return True
        except Exception as e:
            syslog(
                LOG_ERR,
                f"Could not deactivate the log forwarding service: {str(e)}",
            )
            return False

    @cherrypy.tools.json_out()
    def GET(self):
        result = {
            "SDCERR": WEBLCM_ERRORS["SDCERR_FAIL"],
            "InfoMsg": "Could not retrieve log forwarding state",
            "state": "unknown",
        }

        try:
            result["state"] = self.active_state
            if result["state"] != "unknown":
                result["SDCERR"] = WEBLCM_ERRORS["SDCERR_SUCCESS"]
                result["InfoMsg"] = ""
        except Exception as e:
            syslog(LOG_ERR, f"Could not retrieve log forwarding state: {str(e)}")

        return result

    @cherrypy.tools.accept(media="application/json")
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def PUT(self):
        result = {
            "SDCERR": WEBLCM_ERRORS["SDCERR_FAIL"],
            "InfoMsg": "Could not set log forwarding state",
        }

        try:
            valid_states = ["active", "inactive"]

            post_data = cherrypy.request.json
            requested_state = post_data.get("state", None)
            if requested_state not in valid_states:
                result[
                    "InfoMsg"
                ] = f"Invalid state: {requested_state}; valid states: {valid_states}"
                return result

            # Read the current 'ActiveState' of the log forwarding service
            current_state = self.active_state

            if requested_state == "active":
                # Create the 'flag file' which systemd uses to determine if it should start the
                # systemd-journal-gatewayd.socket unit.
                with open(LOG_FORWARDING_ENABLED_FLAG_FILE, "w"):
                    pass

                if current_state == "active":
                    # Service already active
                    result["InfoMsg"] = "Log forwarding already active"
                    result["SDCERR"] = WEBLCM_ERRORS["SDCERR_SUCCESS"]
                else:
                    # Activate service
                    if self.activate():
                        result["InfoMsg"] = "Log forwarding activated"
                        result["SDCERR"] = WEBLCM_ERRORS["SDCERR_SUCCESS"]
            elif requested_state == "inactive":
                # Remove the 'flag file' which systemd uses to determine if it should start the
                # systemd-journal-gatewayd.socket unit.
                try:
                    os.remove(LOG_FORWARDING_ENABLED_FLAG_FILE)
                except OSError:
                    # Handle the case where the file isn't already present
                    pass

                if current_state == "inactive":
                    # Service is already inactive
                    result["InfoMsg"] = "Log forwarding already inactive"
                    result["SDCERR"] = WEBLCM_ERRORS["SDCERR_SUCCESS"]
                else:
                    # Deactivate service
                    if self.deactivate():
                        result["InfoMsg"] = "Log forwarding deactivated"
                        result["SDCERR"] = WEBLCM_ERRORS["SDCERR_SUCCESS"]
        except Exception as e:
            syslog(LOG_ERR, f"Could not set log forwarding state: {str(e)}")
            result = {
                "SDCERR": WEBLCM_ERRORS["SDCERR_FAIL"],
                "InfoMsg": "Could not set log forwarding state",
            }

        return result


@cherrypy.expose
class LogSetting(object):
    @cherrypy.tools.accept(media="application/json")
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def POST(self):
        result = {"SDCERR": 1, "InfoMsg": ""}
        post_data = cherrypy.request.json

        if not "suppDebugLevel" in post_data:
            result["InfoMsg"] = "suppDebugLevel missing from JSON data"
            return result
        if not "driverDebugLevel" in post_data:
            result["InfoMsg"] = "driverDebugLevel missing from JSON data"
            return result

        levels = {"none", "error", "warning", "info", "debug", "msgdump", "excessive"}
        supp_level = post_data.get("suppDebugLevel").lower()
        if not supp_level in levels:
            result["InfoMsg"] = f"suppDebugLevel must be one of {levels}"
            return result

        try:
            bus = dbus.SystemBus()
            proxy = bus.get_object(WPA_IFACE, WPA_OBJ)
            wpas = dbus.Interface(proxy, DBUS_PROP_IFACE)
            wpas.Set(WPA_IFACE, "DebugLevel", supp_level)
        except Exception as e:
            result["InfoMsg"] = "unable to set supplicant debug level"
            return result

        drv_level = post_data.get("driverDebugLevel")
        try:
            drv_level = int(drv_level)
        except Exception as e:
            result["InfoMsg"] = "driverDebugLevel must be 0 or 1"
            return result

        if not (drv_level == 0 or drv_level == 1):
            result["InfoMsg"] = "driverDebugLevel must be 0 or 1"
            return result

        try:
            driver_debug_file = open(WIFI_DRIVER_DEBUG_PARAM, "w")
            if driver_debug_file.mode == "w":
                driver_debug_file.write(str(drv_level))
        except Exception as e:
            result["InfoMsg"] = "unable to set driver debug level"
            return result

        result["SDCERR"] = 0
        result[
            "InfoMsg"
        ] = f"Supplicant debug level = {supp_level}; Driver debug level = {drv_level}"

        return result

    @cherrypy.tools.json_out()
    def GET(self, *args, **kwargs):
        result = {"SDCERR": 0, "InfoMsg": ""}

        try:
            bus = dbus.SystemBus()
            proxy = bus.get_object(WPA_IFACE, WPA_OBJ)
            wpas = dbus.Interface(proxy, DBUS_PROP_IFACE)
            debug_level = wpas.Get(WPA_IFACE, "DebugLevel")
            result["suppDebugLevel"] = debug_level
        except Exception as e:
            result["Errormsg"] = "Unable to determine supplicant debug level"
            result["SDCERR"] = 1

        try:
            driver_debug_file = open(WIFI_DRIVER_DEBUG_PARAM, "r")
            if driver_debug_file.mode == "r":
                contents = driver_debug_file.read(1)
                result["driverDebugLevel"] = contents
        except Exception as e:
            if result.get("SDCERR") == 0:
                result["Errormsg"] = "Unable to determine driver debug level"
            else:
                result[
                    "Errormsg"
                ] = "Unable to determine supplicant nor driver debug level"
            result["SDCERR"] = 1

        return result

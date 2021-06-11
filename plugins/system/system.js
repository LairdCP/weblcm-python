// Copyright (c) 2020, Laird
// Contact: support@lairdconnect.com

function systemAUTORUN(retry) {
  advancedAUTORUN(retry);
  datetimeAUTORUN(retry);
  swupdateAUTORUN(retry);
  usermanageAUTORUN(retry);
  rebootAUTORUN(retry);
  positioningAUTORUN(retry);
}

function advancedAUTORUN(retry) {

  $(document).on("click", "#system_advanced_mini_menu, #system_advanced_main_menu", function(){
    clickAdvancedPage();
  });

  $(document).on("click", "#bt-import-config", function(){

    let passwd = $("#config-encrypt-password").val();
    if (passwd.length < 8 || passwd.length > 64) {
      customMsg("8-64 characters are required", true);
      return;
    }

    fileUpload($("#form-import-config"), $("#input-file-config"), $("#bt-import-config"));
  });

  $(document).on("click", "#bt-export-config", function(){
    let passwd = $("#config-decrypt-password").val();
    if (passwd.length < 8 || passwd.length > 64) {
      customMsg("8-64 characters are required", true);
      return;
    }
    fileDownload('config', $("#bt-export-config"), passwd);
  });

  $(document).on("click", "#bt-export-log", function(){
    let passwd = $("#log-decrypt-password").val();
    if (passwd.length < 8 || passwd.length > 64) {
      customMsg("8-64 characters are required", true);
      return;
    }
    fileDownload('log', $("#bt-export-log"), passwd);
  });

  $(document).on("click", "#bt-export-debug", function(){
    fileDownload('debug', $("#bt-export-debug"));
  });

  $(document).on("click", "#switch-awm-geolocation-scanning", function(){
    if ($("#switch-awm-geolocation-scanning").is(":checked") == true)
      toggleAWMGeolocationScannig(1);
    else
      toggleAWMGeolocationScannig(0);
  });
}

function ddmm2decimal(data){
    let deg = Math.floor(data/100);
    let min = (data - deg*100)/60;
    return (deg + min);
}

function getPositioningData() {
  $.ajax({
    url: "positioning",
    type: "GET",
    contentType: "application/json",
  })
  .done(function(data) {
    SDCERRtoString(data.SDCERR);
    if ( data.positioning['2'] ) {
      if(data.positioning['2']['longitude']){
        $("#form-positioning-data .longitude").text("Longitude: " + data.positioning['2']['longitude']);
      }
      if(data.positioning['2']['latitude']){
        $("#form-positioning-data .latitude").text("Latitude: " + data.positioning['2']['latitude']);
      }
    }

    if ( data.positioning['4'] ) {
      strs = data.positioning['4'].split('\r\n');
      strs.forEach( function(str) {
        //Parse $GNGLL format NMEA data
        if(str.indexOf("$GNGLL") > -1){
          let sLatitude = str.split(',')[1].trim();
          let sLongitude = str.split(',')[3].trim();

          if(sLatitude) {
            let latitude = ddmm2decimal(parseFloat(sLatitude));
            if(str.split(',')[2] === 'S'){
              latitude = -latitude;
            }
            $("#form-positioning-data .latitude").text("Latitude: " + latitude);
          }

          if(sLongitude) {
            let longitude = ddmm2decimal(parseFloat(sLongitude));
            if(str.split(',')[4] === 'W'){
              longitude = -longitude;
            }
            $("#form-positioning-data .longitude").text("Longitude: " + longitude);
          }
        }
      })
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function setPositioningSwitchOnUI(data){
  switch(data) {
    case 2:
      $("#radio-positioning-celllocate").prop('checked',true);
      $("#radio-positioning-gps").prop('disabled',true);
      break;
    case 4:
      $("#radio-positioning-gps").prop('checked',true);
      $("#radio-positioning-celllocate").prop('disabled',true);
      break;
    default:
      $("#radio-positioning-disabled").prop('checked',true);
      $("#radio-positioning-gps").prop('disabled',false);
      $("#radio-positioning-celllocate").prop('disabled',false);
      break;
    }
}

function togglePositioningSwitch(enable) {
  let data = {
    positioning: enable,
  }

  $.ajax({
    url: "positioningSwitch",
    type: "PUT",
    data: JSON.stringify(data),
    contentType: "application/json",
  })
  .done(function(data) {
    SDCERRtoString(data.SDCERR);
    setPositioningSwitchOnUI(data.positioning);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function getPositioningSwitch() {
  $.ajax({
    url: "positioningSwitch",
    type: "GET",
    contentType: "application/json",
  })
  .done(function(data) {
    setPositioningSwitchOnUI(data.positioning);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

//It takes a few seconds to enable/disable positioning
function savePositioningToken() {
  let data = {
    token:$("#positioning-token").val().trim(),
  }

  $.ajax({
    url: "positioning",
    type: "PUT",
    data: JSON.stringify(data),
    contentType: "application/json",
  })
  .done(function(data) {
    SDCERRtoString(data.SDCERR);
    if(!data.SDCERR)
      $("#positioning-token").val('');
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function clickPositioningPage() {
  $.ajax({
    url: "plugins/system/html/positioning.html",
    data: {},
    type: "GET",
    dataType: "html",
  })
  .done(function(data){
    $(".active").removeClass("active");
    $("#system_positioning_main_menu").addClass("active");
    $("#system_positioning_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();
    getPositioningSwitch();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function positioningAUTORUN(retry) {

  $(document).on("click", "#system_positioning_mini_menu, #system_positioning_main_menu", function(){
    clickPositioningPage();
  });

  $(document).on("click", "#bt-positioning-switch", function(){
    let form = document.querySelector("#form-positioning-switch");
    let data = new FormData(form);
    let output = 0;
    for (const entry of data) {
      output += parseInt(entry[1]);
    };
    togglePositioningSwitch(output);
  });

  $(document).on("click", "#bt-positioning-refresh", function(){
    getPositioningData();
  });

  $(document).on("click", "#bt-positioning-token", function(){
    savePositioningToken();
  });
}

function toggleAWMGeolocationScannig(enable) {
  let data = {
    geolocation_scanning_enable: enable,
  }

  $.ajax({
    url: "awm",
    type: "PUT",
    data: JSON.stringify(data),
    contentType: "application/json",
  })
  .done(function(data) {
    SDCERRtoString(data.SDCERR);
    $("#switch-awm-geolocation-scanning").prop('checked', data.geolocation_scanning_enable);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function getAWMGeolocationScannig() {
  $.ajax({
    url: "awm",
    type: "GET",
    contentType: "application/json",
  })
  .done(function(data) {
    SDCERRtoString(data.SDCERR);
    $("#switch-awm-geolocation-scanning").prop('checked', data.geolocation_scanning_enable);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function rebootAUTORUN(retry) {

  $(document).on("click", "#system_reboot_mini_menu, #system_reboot_main_menu", function(){
    clickRebootPage();
  });
  $(document).on("click", "#bt-reboot", function(){
    reboot(true);
  });
  $(document).on("click", "#bt-reboot-firmwareupdate", function(){
    reboot(true);
  });

  $(document).on("click", "#bt-factory-reset", function(){
    factoryReset();
  });
}

function reboot(show) {

  if(show){
    var r = confirm(g_i18nData['Are you sure you want to reboot system?']);
    if (r == false)
      return;
  }
  $("#bt-reboot-display").addClass("d-none");

  $.ajax({
    url: "reboot",
    type: "PUT",
  })
  .done(function() {
    $("#helpText").html("System rebooting...");
    $("#bt-factory-reset").prop("disabled", true);
    $("#bt-reboot").prop("disabled", true);
    setTimeout(function(){ window.location.reload(true); }, 60000);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function factoryReset(){
  var r = confirm(g_i18nData['Are you sure you want to do factory reset?']);
  if (r == false)
    return;

  $.ajax({
    url: "factoryReset",
    type: "PUT",
  })
  .done(function(msg) {
    SDCERRtoString(msg.SDCERR);
    reboot();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function clickRebootPage() {
  $.ajax({
    url: "plugins/system/html/reboot.html",
    data: {},
    type: "GET",
    dataType: "html",
  })
  .done(function(data){
    $(".active").removeClass("active");
    $("#system_reboot_main_menu").addClass("active");
    $("#system_reboot_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function clickAdvancedPage() {
  $.ajax({
    url: "plugins/system/html/advanced.html",
    data: {},
    type: "GET",
    dataType: "html",
  })
  .done(function(data){
    $(".active").removeClass("active");
    $("#system_advanced_main_menu").addClass("active");
    $("#system_advanced_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();
    getAWMGeolocationScannig();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function datetimeAUTORUN(retry) {

  $(document).on("click", "#system_datetime_mini_menu, #system_datetime_main_menu", function(){
    clickDatetimePage();
  });

  $(document).on("click", "#bt-import-timezone", function(){
    fileUpload($("#form-import-timezone"), $("#input-file-timezone"), $("#bt-import-timezone"));
  });

  $(document).on("change", "#datetime-config", function(){
    onChangeDatetimeConfig();
  });

  $(document).on("click", "#bt-save-timezone", function(){
    saveTimezone();
  });

  $(document).on("click", "#bt-save-datetime", function(){
    saveDateTime();
  });

}

function validateDateString(date){
  let maxDays;
  let year, month, day;

  let strs = date.trim().split("-");
  if(strs.length != 3) return -1;

  year = parseInt(strs[0]);
  if(year.toString() != strs[0]) return -1;
  if(year < 1970 || year > 2200) return -1;

  strs[1] = strs[1].replace(/^0+/, '');
  month = parseInt(strs[1]);
  if(month.toString() != strs[1]) return -1;
  if(month < 1 || month > 12) return -1;

  strs[2] = strs[2].replace(/^0+/, '');
  day = parseInt(strs[2]);
  if(day.toString() != strs[2]) return -1;
  if(day < 1) return -1;

  switch(month){
    case 4:
    case 6:
    case 9:
    case 11:
      maxDays = 30;
      break;
    case 2:
       maxDays = year % 4  ? 28 : 29;
       break;
    default:
      maxDays = 31;
      break;
  }

  return maxDays >= day ? 0 : -1;
}


function validateTimeString(time){
  let hour, minute, second;

  let strs = time.trim().split(":");
  if(strs.length != 3) return -1;

  strs[0] = strs[0].replace(/^0+/, '');
  if(strs[0].length > 0){
    hour = parseInt(strs[0]);
    if(hour.toString() != strs[0]) return -1;
    if(hour < 0 || hour > 23) return -1;
  }

  strs[1] = strs[1].replace(/^0+/, '');
  if(strs[1].length > 0){
    minute = parseInt(strs[1]);
    if(minute.toString() != strs[1]) return -1;
    if(minute < 0 || minute > 59) return -1;
  }

  strs[2] = strs[2].replace(/^0+/, '');
  if(strs[2].length > 0){
    second = parseInt(strs[2]);
    if(second.toString() != strs[2]) return -1;
    if(second < 0 || second > 59) return -1;
  }

  return 0;
}


function saveTimezone() {
  let data = {
    zone:$("#datetime-timezone").val(),
  }

  $.ajax({
    url: "datetime",
    type: "PUT",
    data: JSON.stringify(data),
    contentType: "application/json",
  })
  .done(function(data) {
    SDCERRtoString(data.SDCERR);
    if (data.SDCERR == g_defines.SDCERR.SDCERR_SUCCESS){
      $("#datetime-time").val(data.time)
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function saveDateTime() {

  let datetime =  $("#datetime-time").val().trim().split(" ");
  if(datetime.length != 2){
	customMsg("Date time setting is invalid", true);
    return;
  }

  if(validateDateString(datetime[0]) == -1){
    customMsg("Date is invalid", true);
    return;
  }

  if(validateTimeString(datetime[1]) == -1){
    customMsg("Time is invalid", true);
    return;
  }

  data = {
    method:$("#datetime-config").val(),
    datetime:$("#datetime-time").val().trim(),
  };

  $.ajax({
    url: "datetime",
    type: "PUT",
    data: JSON.stringify(data),
    contentType: "application/json",
  })
  .done(function(data) {
    SDCERRtoString(data.SDCERR);
    if (data.SDCERR == g_defines.SDCERR.SDCERR_SUCCESS){
      $("#datetime-time").val(data.time)
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function getTimezoneList(){
  $.ajax({
    url: "datetime",
    type: "GET",
    contentType: "application/json",
  })
  .done(function(data) {

      let sel = $("#datetime-timezone");
      sel.empty();

      data.zones.sort()
      for (let i=0; i<data.zones.length; i++) {
        let option = "<option value=" + data.zones[i] + ">" + data.zones[i] + "</option>";
        sel.append(option);
      }

      $("#datetime-time").val(data.time)
      $("#datetime-timezone").val(data.zone);
      $("#datetime-timezone").change();
      $("#datetime-config").val(data.method);
      $("#datetime-config").change();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function onChangeDatetimeConfig(){

  let method = $("#datetime-config").val();
  switch(method){
    case "manual":
      $("#datetime-time").prop('disabled', false);
      break;
    default:
      $("#datetime-time").prop('disabled', true);
      break;
  }
}

function clickDatetimePage() {
  $.ajax({
    url: "plugins/system/html/datetime.html",
    type: "GET",
    cache: false,
    dataType: "html",
  })
  .done(function(data){
    $(".active").removeClass("active");
    $("#system_datetime_main_menu").addClass("active");
    $("#system_datetime_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();
    getTimezoneList();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}
function swupdateAUTORUN(retry) {

  $(document).on("click", "#system_swupdate_mini_menu, #system_swupdate_main_menu", function(){
    clickSWUpdatePage();
  });

  $(document).on("click", "#bt-firmware-update", function(){
    updateFirmware();
  });

}

var fw_start;
var fw_reader;
var fw_xhr;
var fw_total_bytes = 0;
var fw_step = 1024*128;

function upload_one_chunk() {
  var file = $("#fw-name")[0].files[0];
  var blob = file.slice(fw_start, fw_start + fw_step);

  fw_reader.onload = function(e) {
    var data = fw_reader.result;
    fw_xhr.open('PUT', "firmware", true);
    fw_xhr.setRequestHeader("Content-Type", "application/octet-stream");
    fw_xhr.send(data);
  }

  fw_reader.readAsArrayBuffer(blob);
}

function updateFirmware() {

  let data = {
    "image": $("#select-image").val()
  };

  if( $("#fw-name")[0].files.length == 0 ) {
	customMsg("Please select firmware", true);
    return;
  }

  $("#bt-firmware-update").prop("disabled", true);
  $("#swupdate-progress-display").attr("aria-valuenow", 0);
  $("#swupdate-progress-display").width("0%");
  $("#swupdate-progress-display").text("0%");
  $("#fw-update-status").text(g_i18nData['Checking...']);

  $.ajax({
    url: "firmware",
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
  })
  .done(function(msg) {

    if(msg.SDCERR){
      update_end(g_i18nData[msg.message] ? g_i18nData[msg.message] : msg.message);
      return;
    }

    fw_start = 0;
    fw_total_bytes = $("#fw-name")[0].files[0].size;

    $("#fw-update-status").text(g_i18nData['Updating...']);
    $("#bt-reboot-display").addClass("d-none");

    fw_reader = new FileReader();
    fw_xhr = new XMLHttpRequest();

    fw_xhr.upload.onprogress = function(event) {
      fw_start +=  event.loaded;
      r = Math.round(fw_start * 100/fw_total_bytes);
      $("#swupdate-progress-display").attr("aria-valuenow", r);
      $("#swupdate-progress-display").width(r + "%");
      $("#swupdate-progress-display").text(r + "%");
    };

    fw_xhr.upload.onerror = function() {
      update_end(g_i18nData['Update failed!']);
    };

    fw_xhr.upload.onabort = function() {
      update_end(g_i18nData['Update aborted!']);
    };

    fw_xhr.onloadend = function() {
      if (fw_xhr.status == 200) {
        if(fw_start < fw_total_bytes)
          upload_one_chunk();
        else
          setTimeout(update_end_check, 6000);
      }
      else {
        update_end(g_i18nData['Update failed!']);
      }
    };

    upload_one_chunk();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    update_end(g_i18nData['Update failed!']);
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function reboot_device() {
  g_i18nData['Update finished. Please reboot device!'];
  $("#bt-reboot-display").removeClass("d-none");
}

function update_end_check(){
  $.ajax({
    url: "firmware?mode=0", //For swupdate client update
    type: "GET",
    cache: false,
  })
  .done(function(msg) {
    update_end(msg.SDCERR ? g_i18nData['Update failed!'] : reboot_device());
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function update_end(msg) {

  $.ajax({
    url: "firmware",
    type: "DELETE",
  })
  .done(function() {
    $("#fw-update-status").text(msg);
    $("#bt-firmware-update").prop("disabled", false);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function clickSWUpdatePage() {
  $.ajax({
    url: "plugins/system/html/swupdate.html",
    type: "GET",
    dataType: "html",
  })
  .done(function(data){
    $(".active").removeClass("active");
    $("#system_swupdate_main_menu").addClass("active");
    $("#system_swupdate_mini_menu").addClass("active");
    $('#main_section').html(data);
    setLanguage("main_section");
    clearReturnData();

    //In case swupdate was cancelled by clicking a menu item, backend needs to be updated.
    update_end(g_i18nData['Update Status']);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function usermanageAUTORUN(retry) {

  $(document).on("click", "#system_user_mini_menu, #system_user_main_menu", function(){
    clickAddOrDelUser();
  });

  $(document).on("click", "#system_password_mini_menu, #system_password_main_menu", function(){
    clickUpdatePassword();
  });

  $(document).on("click", "#bt-update-password", function(){
    updatePassword();
  });

  $(document).on("click", "#bt-add-user", function(){
    addUser();
  });

}

function validatePassword(passwd) {

  if(passwd.length < 8 || passwd.length > 64) {
    return "8-64 characters are required for password";
  }

  if(passwd.match(/[a-zA-Z]/g) == null) {
    return "At least one letter is required for password";
  }

  if(passwd.match(/[0-9]/g) == null) {
    return "At least one special character is required for password";
  }

  if(passwd.match(/[^a-zA-Z0-9]/g) == null) {
    return "At least one digit is required for password";
  }
  return;
}

function validateUsername(username){
  if (username.length < 4 || username.length > 64)
    return "4-64 characters required for username";

  inval = username.match(/\W/g);
  if(inval != null)
    return "Only alphanumeric characters are allowed for username";

  return;
}

function updatePassword() {
  let curr_password = $("#password-current-password").val();

  let new_password = $("#password-new-password").val();
  let err = validatePassword(new_password);
  if(err){
    customMsg(err, true);
    return;
  }

  confirm_password = $("#password-confirm-password").val();
  if (new_password !== confirm_password){
    customMsg("Password and confirmation password don't match", true);
    return;
  }

  if (curr_password == new_password){
    customMsg("New password must be different from the old one", true);
    return;
  }

  let creds = {
    username: g_curr_user,
    current_password: curr_password,
    new_password: new_password,
  }

  $.ajax({
    url: "users",
    type: "PUT",
    data: JSON.stringify(creds),
    contentType: "application/json",
  })
  .done(function(data) {

    if(data.SDCERR !== g_defines.SDCERR.SDCERR_SUCCESS){
	  customMsg("Password incorrect", true);
    }
    else {
      SDCERRtoString(data.SDCERR);
      if (data.REDIRECT == 1){
        login(g_curr_user, new_password);
      }
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}


function createUserList(users) {

  var tbody = $("#table-user > tbody");

  tbody.empty()

  for (var name in users) {
    row = '<tr permission="'+ users[name] + '">';

    row += '<td class="text-center">';
    row += name;
    row += '</td>';

    row += '<td class="text-center">';
    row += '<input type="button" class="btn btn-primary" id="bt-load-permission-' + name + '" value="' + g_i18nData['load perm'] + '">';
    row += '</td>';

    $(document).on("click", "#bt-load-permission-" + name, function(){
      loadPermission();
    });

    row += '<td class="text-center">';
    row += '<input type="button" class="btn btn-primary" id="bt-update-permission-' + name + '" value="' + g_i18nData['update perm'] + '">';
    row += '</td>';

    $(document).on("click", "#bt-update-permission-" + name, function(){
      updatePermission();
    });

    row += '<td class="text-center">';
    row += '<input type="button" class="btn btn-primary" id="bt-del-user-' + name + '" value="' + g_i18nData['Delete'] + '">';
    row += '</td>';

    $(document).on("click", "#bt-del-user-" + name, function(){
      delUser();
    });

    row += '</tr>';

    tbody.append(row);
  }

  $("#table-user tbody").on("click", "tr td:first-child", function(e){
    row = $(this).closest('tr');
    row.addClass('bg-info').siblings().removeClass('bg-info');
  });
}

function get_user_list() {
  clearReturnData();

  $.ajax({
    url: "users",
    type: "GET",
    cache: false,
  })
  .done(function(data) {
    createUserList(data);
    clearPerm();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function clearPerm() {

  $("[id^=user-permission-]:checked").not(":disabled").each(function() {
    $(this).prop('checked', false);
  });

}

function setPerm(perm){

  clearPerm();

  let arr = perm.split(" ");
  arr.forEach(function (item, index) {
    $("#user-permission-"+item).prop('checked', true);
  });
}


function getPerm() {
  var perm = "";

  $("[id^=user-permission-]").each(function() {
    if ($(this).is(":checked")){
      perm = $(this).attr("name").concat(" ", perm);
    }
  });

  return perm;
}

function addUser() {
  var perm = getPerm();

  var creds = {
    username: $("#user-username").val(),
    password: $("#user-password").val(),
    permission: perm,
  }

  err = validatePassword(creds.password);
  if(err){
	customMsg(err, true);
	return;
  }

  err = validateUsername(creds.username);
  if(err){
	customMsg(err, true);
	return;
  }

  $.ajax({
    url: "users",
    type: "POST",
    data: JSON.stringify(creds),
    contentType: "application/json",
  })
  .done(function(data) {
    if(data['SDCERR'] !== g_defines.SDCERR.SDCERR_SUCCESS){
      customMsg("Add user failed", true);
    }
    else{
	  $("#user-username").val("");
	  $("#user-password").val("");
      get_user_list();
	}
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function loadPermission(){
  var id = event.srcElement.id;
  var row = $("#"+id).closest('tr');
  var perm = row.attr("permission");
  setPerm(perm);
  row.addClass('bg-info').siblings().removeClass('bg-info');
}

function updatePermission(){
  var id = event.srcElement.id;
  var row = $("#"+id).closest('tr');

  if(!row.hasClass("bg-info"))
  {
    customMsg("Please select user first by clicking user name", true);
    return;
  }

  var perm = getPerm();
  var creds = {
    username: id.slice(21),
    permission: perm,
  };

  $.ajax({
    url: "users",
    type: "PUT",
    data: JSON.stringify(creds),
    contentType: "application/json",
  })
  .done(function(data) {
    SDCERRtoString(data.SDCERR);
    if(data['SDCERR'] == g_defines.SDCERR.SDCERR_SUCCESS){
      row.attr("permission", perm);
      setPerm(perm);
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function delUser(){
  var id = event.srcElement.id;
  var row = $("#"+id).closest('tr');

  if(!row.hasClass("bg-info"))
  {
    customMsg("Please select user first by clicking user name", true);
    return;
  }

  $.ajax({
    url: "users?username=" + id.slice(12),
    type: "DELETE",
  })
  .done(function(data) {
    if(data['SDCERR'] !== g_defines.SDCERR.SDCERR_SUCCESS){
      customMsg("Delete user failed", true);
    }
    else{
      get_user_list();
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function createPermissionsTable(){

  var types = g_defines.PERMISSIONS.UserPermssionTypes;
  var attrs = g_defines.PERMISSIONS.UserPermssionAttrs;
  var j = 0;

  var tbody = $("#table-user-permission > tbody");
  tbody.empty()

  for (let i = 0; i < types.length; i++){

    if(attrs[i][0].length == 0)
      continue;

    if (j == 0){
      row = '<tr>';
    }
    ++j;

    row += '<td class="text-left">';
    row += '<label>';
    row += '<input type="checkbox" id="user-permission-' + types[i] + '" name="' + types[i] + '" ' + attrs[i][1] + " " + attrs[i][2] + '>';
    row +=  (g_i18nData[attrs[i][0]] ? g_i18nData[attrs[i][0]] : attrs[i][0]) + '</label>'
    row += '</td>';

    if (j == 4){
      row += '</tr>';
      tbody.append(row);
      j = 0;
    }
  }

  if (j % 4){
    row += '</tr>';
    tbody.append(row);
  }
}

function clickAddOrDelUser(){
  $.ajax({
    url: "plugins/system/html/manage_user.html",
    data: {},
    type: "GET",
    dataType: "html",
  })
  .done(function(data){
    $(".active").removeClass("active");
    $("#system_user_main_menu").addClass("active");
    $("#system_user_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();
    createPermissionsTable();
    get_user_list();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function clickUpdatePassword(){
  $.ajax({
    url: "plugins/system/html/update_password.html",
    data: {},
    type: "GET",
    dataType: "html",
  })
  .done( function(data) {
    $(".active").removeClass("active");
    $("#system_password_main_menu").addClass("active");
    $("#system_password_mini_menu").addClass("active");
    $('#main_section').html(data);
    setLanguage("main_section");
    clearReturnData();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

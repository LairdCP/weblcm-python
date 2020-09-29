// Copyright (c) 2020, Laird Connectivity
// Contact: support@lairdconnect.com

function datetimeAUTORUN(retry) {

  $(document).on("click", "#datetime_mini_menu, #datetime_main_menu", function(){
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
    if (data.SDCERR == defines.SDCERR.SDCERR_SUCCESS){
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
	CustomMsg("Date time setting is invalid", true);
    return;
  }

  if(validateDateString(datetime[0]) == -1){
    CustomMsg("Date is invalid", true);
    return;
  }

  if(validateTimeString(datetime[1]) == -1){
    CustomMsg("Time is invalid", true);
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
    if (data.SDCERR == defines.SDCERR.SDCERR_SUCCESS){
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
    url: "plugins/datetime/html/datetime.html",
    type: "GET",
    cache: false,
    dataType: "html",
  })
  .done(function(data){
    $(".active").removeClass("active");
    $("#datetime_main_menu").addClass("active");
    $("#datetime_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();
    getTimezoneList();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

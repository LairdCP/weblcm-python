source global_settings

echo -e "\n========================="
echo "Add virtual networkinterface"

${CURL_APP} -s --location \
    --header "Content-Type: application/json" \
    --request POST ${URL}/networkInterfaces \
     ${AUTH_OPT} \
    --data '{ "interface": "wlan1",
              "type": "STA" }' \
| ${JQ_APP}

echo -e "\n"
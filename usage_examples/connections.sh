source global_settings

echo "========================="
echo "Connections"
${CURL_APP} --header "Content-Type: application/json" \
    --request GET \
    ${URL}/connections \
    -b cookie --insecure \
| ${JQ_APP}

echo -e "\n"
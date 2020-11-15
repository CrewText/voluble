if [ -z HEROKU_APP_ID ]
    then
        echo "Adding GH token to GitHub package sources"
        sed -i 's/https:\/\/github.com/https:\/\/calmcl1:${GITHUB_TOKEN}@github.com/' package.json
fi
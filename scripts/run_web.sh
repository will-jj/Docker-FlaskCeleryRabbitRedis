#!/bin/sh
cd strava_flask
#su -m app -c "python app.py"
#su -m app -c "uwsgi --socket 0.0.0.0:8000 --protocol=http -w wsgi"
su -m app -c "uwsgi --ini app.ini"

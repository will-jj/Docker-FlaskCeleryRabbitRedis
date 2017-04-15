#!/bin/sh
cd strava_flask  
su -m app -c "celery -A tasks worker --loglevel INFO"  

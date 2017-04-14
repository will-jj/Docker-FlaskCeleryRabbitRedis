#!/bin/sh

# wait for RabbitMQ server to start
sleep 10

cd strava_flask  

# run Celery worker for our project myproject
su -m wj -c "celery -A app.celery worker"  

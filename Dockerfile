FROM python:latest

# add requirements.txt to the image
ADD requirements.txt /app/requirements.txt
ADD stravalib /app/stravalib/
# set working directory to /app/
WORKDIR /app/stravalib/
RUN python setup.py install
# install python dependencies
WORKDIR /app/
RUN pip install -r requirements.txt

# create unprivileged user
RUN adduser --disabled-password --gecos '' app  

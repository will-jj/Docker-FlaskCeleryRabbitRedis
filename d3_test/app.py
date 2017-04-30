from flask import Flask, redirect, url_for, render_template, flash, make_response, abort,request,jsonify
from flask import render_template_string

import pickle

import json

import numpy as np

import json

APP = Flask(__name__)






@APP.route('/')
def index():
    return render_template('strava_plot.html')



if __name__ == '__main__':
    
    APP.run(host='0.0.0.0')

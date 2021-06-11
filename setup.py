#!/usr/bin/python
from setuptools import setup

setup(
	name='weblcm-python',
	version='1.0',
	py_modules=[
		'__main__', 'weblcm_network', 'weblcm_log', 'weblcm_def', 'weblcm_swupdate',
		'weblcm_users', 'weblcm_files', 'weblcm_advanced', 'weblcm_network_status',
		'weblcm_settings', 'weblcm_datetime', 'weblcm_modem'
	]
)

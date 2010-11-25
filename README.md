MavCrop
==========

MavCrop is a simple, light-weight mootools library that provides the ability to crop an image. 
See demo included within the /demo directory.

![Screenshot](https://github.com/dcdustin/MavCrop/raw/master/logo.png)

How to use
----------

Basic HTML required for use.

*HTML*
    #HTML
        <img src="image.jpg" id="image_name">

See documentation for details on options for instantiation

*JS*
    #JS
        var mcrop = new MavCrop('image_name', {
            // options
        });
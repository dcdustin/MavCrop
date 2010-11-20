<?php 

/**
 * @package MavCrop
 * @author Dustin hansen
 * @Copyright Dustin Hansen 2010 [http://maveno.us]
 * 
 * Here's the deal, this is the absolute simplest method for illustrating how to use mavcrop to crop an image.
 * Don't use this as-is on your website, I make no guarantee that this will work for you particular use, and in
 * no way am I claiming that this is secure, ideal, or even advisable. 
 * 
 * Just sayin'
 */

	// this will of course need to be the variable you send it back to the server as.
	$json = json_decode($_REQUEST['json'], true);
	
	// remember to sanitize people!
	$image_path = $json['image'];
	
	// I will also make the assumption that the image is a jpg.
	$orig = imagecreatefromjpeg($image_path);
	
	// I will also assume that $json properly contains the variables I need. Don't do this.
	$cropped = imagecreatetruecolor($json['w'], $json['h']);
	
	// again, don't do this without verifying a few things first.
	// make sure w, h, x, y are all defined. 
	// make sure x < w, and y < h.
	imagecopy($cropped, $orig, 0, 0, $json['x'], $json['y'], $json['w'], $json['h']);

	// We're not going to save this to disk, no, we're just gonna spit it out to the browser.	
	header('Content-type: image/png');
	imagejpeg($cropped);
	imagedestroy($cropped);	
?>
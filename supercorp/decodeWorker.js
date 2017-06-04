"use strict";

importScripts("ffmpeg.js");

self.onmessage = function (e)
{
	var data = e.data;
	var file = data.value;
	var id = data.jobID;
	
	function stdout(str)
	{
		send('log', str);
	};
	
	function progress(i)
	{
		send('progress', i);
	};
	
	function send(type, value)
	{
		self.postMessage({
			type: type,
			value: value,
			jobID: id
		});
	}
	
	try {
		var result = FFMPEG(file, progress, stdout);
		send('complete', result);
	} catch (e) {
		send('error', e.toString());
	}
}
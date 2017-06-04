(function () {
	'use strict';
	
	var AUDIO_WORKER_URL = "decodeWorker.js";
	
	var workers = [];
	var queue = [];
	var pending = [];
	var active = false;
	var jobs = 0;
	var hasWorkers = !!window.Worker;
	
	function CreateWorker ()
	{
		var worker = new Worker(AUDIO_WORKER_URL);
		workers.push(worker);
		worker.onmessage = OnWorkerMessage;
		
		ProcessNext();
	}
	
	function GetJobWithID (id)
	{
		for (var i = 0, l = pending.length; i < l; i++)
		{
			if (pending[i].jobID === id)
				return pending[i];
		}
	}
	
	function DeleteJobWithID (id)
	{
		for (var i = 0, l = pending.length; i < l; i++)
		{
			if (pending[i].jobID === id)
				return pending.splice(i, 1);
		}
	}
	
	function ProcessNext()
	{		
		if (!active && workers.length)
		{
			var worker = workers.pop();
			worker.terminate();
		}
		
		if (queue.length && workers.length)
		{
			var worker = workers.pop();
			var job = queue.shift();
			
			pending.push(job);
			
			worker.postMessage({
				jobID: job.jobID,
				value: job.buffer	
			});		
		}
	}
	
	function OnWorkerMessage (e)
	{
		var data = e.data;
		var jobID = data.jobID;
		var job = GetJobWithID(jobID);
		switch (data.type)
		{
			case "error":
				job.callback(data.value, null);
				DeleteJobWithID(jobID);
				workers.push(this);
				ProcessNext();
				break;
			
			case "progress":
				job.progress && job.progress(data.value);
				break;
				
			case "log":
				break;
				
			case "complete":
				job.callback(null, data.value.buffer);
				DeleteJobWithID(jobID);
				workers.push(this);
				ProcessNext();
				break;
		}
	}
	
	function StartWorkers (n)
	{
		if (active)
			return;
			
		var cores = navigator.hardwareConcurrency || 2;
		n = parseInt(n);
		n = isNaN(n) ? cores : cr.clamp(n, 0, cores);
		
		active = true;
		
		while (n--)
			CreateWorker();
	}
	
	window.OpusDecoder = function (buffer, callback, progress)
	{
		if (!(buffer instanceof ArrayBuffer))
			throw new TypeError("argument 1 must be an instance of ArrayBuffer");
			
		queue.push({
			buffer: new Uint8Array(buffer),
			jobID: jobs++,
			callback: callback,
			progress: progress
		});
		
		if (!active)
			StartWorkers();
		else
			ProcessNext();
	};
	
	window.OpusDecoder.Initialise = function (n)
	{
		if (!active)
			StartWorkers(n);
	};
	
	window.OpusDecoder.Destroy = function ()
	{
		if (!active)
			return;
			
		for (var i = 0, l = workers.length; i < l; i++)
		{
			workers[i].terminate();
		}
		workers.length = 0;
		active = false;
	};
}());
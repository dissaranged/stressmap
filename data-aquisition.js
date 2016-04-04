const fs = require('fs');
(function () {
  var jsdom = require('jsdom');
  var Iconv = require('iconv').Iconv
  var iconv = new Iconv('ISO-8859-15', 'UTF-8');
  
                  // Stressfaktoren
  var fixings = {'Scherer8': {address: 'Schererstr 8, 13347 Berlin'},
		 'Rosa Rose': {address: 'Jessnerstr. 3, 10247 Berlin'},
		 'Babylonia': {address: 'Cuvrystr. 21, 10997 Berlin'},
		 // KueFas
		 'Groni50':  { name: "Groni50 (Wedding)" },
		 'FE61': { name: "FREE e.V." },
		 'Kreutziger 19': {name: "K19 Café"},
		 'KvU': {"name": "KvU (Kirche von Unten)"},
		 "Köpi": {"name": "KvU (Kirche von Unten)"},
		 "New Yorck (im Bethanien)": {"name": "New Yorck im Bethanien"},
		 "Projektraum": {"name": "Projektraum H48 (Neukölln)"},
		 "Scherer 8": {"name": "Scherer8"},
		 "Thommy-Weißbecker-Haus": {"name": "Tommy-Weisbecker-Haus"}
		};

  
  // Get VoKues
  function get_vokues(html) {
    jsdom.env(
      html,
      ["http://code.jquery.com/jquery.js"],
      function (err, window) {
	const $ = window.jQuery
	var vokues = {};
	
	function forOneDay(el) {
	  var today = []
	  $('span.text2', el).html().split('<br>').forEach(function(html){
    	    var obj = {};
    	    var el = $('<div>'+ html +'</div>');
    	    obj.name = $('b',el).text().trim()
	    var loc = $('b a',el)[0]
	    if( loc ) {
	      var m = /adressen\.php\?loc=(\d*)/.exec(loc.href)
	      if(m)
		obj.loc = m[1];
	    }
    	    $('b',el).remove();
    	    obj.desc = el.html();
    	    var time =  /\d\d:\d\d/.exec(obj.desc);
    	    obj.time = time ? time[0]: time

	    if(fixings[obj.name]) {
	    Object.keys(fixings[obj.name]).forEach(key => {
	      obj[key] = fixings[obj.name][key]
	    })
	  }
    	    today.push(obj);
	  })
	  return today;
	}
	$('table:eq(3) td:eq(1) table').each(function(i,e) {
	  var day = $('tr:eq(0) span.text2', e).text().trim();
	  var data = forOneDay($('tr:eq(1)', e));
	  vokues[day] = data;
	});
	var vokues_sum = Object.keys(vokues).reduce(function(sum, k){
	  sum += vokues[k].length
	  return sum;
	},0)
	fs.writeFile('./tst-kuefas.json',
    		     JSON.stringify(vokues, null, 2),
    		     'utf-8',
    		     (err) => {
    		       if (err) throw err;
    		       console.log('Saved Kuefas : '+ vokues_sum +' items found.');
    		     });
      }
    );
  }

  function get_stressis(html) {
    // getting all Addresses
    jsdom.env(
      //"http://stressfaktor.squat.net/adressen.php",
      html,
      ["http://code.jquery.com/jquery.js",
       "https://api.mapbox.com/mapbox.js/v2.3.0/mapbox.js"],
      function(err, window) {
	const $ = window.jQuery
	var L = window.L
	var stressis = [];
	$('table:eq(3) table').each(function(i, e){
  	  var item = {};
  	  item.name = $(e).find('tr:eq(0) span b').text().trim();
  	  var address = $(e).find('tr:eq(0) span');
  	  address.find('b').remove();
  	  item.full_address = address.text().trim();;
	  item.address = item.full_address.replace(/\([^)]*\)/g, '').trim();
  	  item.info = $(e).find('tr:eq(1) span').html();
  	  item.www = $(e).find('tr:eq(2) a[href*="http"]').attr('href');
  	  item.email = $(e).find('tr:eq(2) a[href*="mailto"]')
  	    .attr('href');
  	  var tel = $(e).find('tr:eq(2) span');
  	  tel.find('a').remove();
  	  item.telephone = tel.text();
	  if(fixings[item.name]) {
	    Object.keys(fixings[item.name]).forEach(key => {
	      item[key] = fixings[item.name][key]
	    })
	  }

  	  stressis.push(item);
	});
	//geoCoding
	L.mapbox.accessToken = 'pk.eyJ1IjoiZ2dyaW4iLCJhIjoiY2ltYjljMnJhMDAya3dmbTZ1d3hzNGVzbyJ9.jpe-T4LzCNjdpByfbHrJOA';
	var geocoder = L.mapbox.geocoder('mapbox.places');

	function gotOne(i, err, data) {
      	  if (data.latlng) {
            stressis[i].coordinates = data.latlng.reverse();
      	  } else {
      	    console.error("couldn't retrieve geoLocation for : ",
      			  stressis[i].address, "recived : ",err, data);
      	  }
	  
      	  if(++i < stressis.length){
      	    getOne(i);
      	  } else {
      	    console.log('retrieved all geoData');
      	    allDone();
      	  }
	};
	
	function getOne(i) {
      	  var item = stressis[i]
	  console.log('retriving coordinates for '+item.name)
	  //gotOne(i,null,{});return;
      	  geocoder.query(item.address, gotOne.bind(null, i));
	}
	getOne(0)
	function allDone() {
      	  fs.writeFile('./tst-stressfaktoren.json',
      		       JSON.stringify(stressis, null, 2),
      		       'utf-8',
      		       (err) => {
      			 if (err) throw err;
      			 console.log('Saved Addresses : '+ stressis.length +' items found.');
      		       });
	}

      });
  }

  function get_events(html) {
    jsdom.env(
      //"http://stressfaktor.squat.net/adressen.php",
      html,
      ["http://code.jquery.com/jquery.js",
       "https://api.mapbox.com/mapbox.js/v2.3.0/mapbox.js"],
      {encoding: 'binary'},
      function(err, window) {
	var $ = window.jQuery;
	var L = window.L;

	L.mapbox.accessToken = 'pk.eyJ1IjoiZ2dyaW4iLCJhIjoiY2ltYjljMnJhMDAya3dmbTZ1d3hzNGVzbyJ9.jpe-T4LzCNjdpByfbHrJOA';
	var geocoder = L.mapbox.geocoder('mapbox.places');

	var c_geocoder = 0;
	events = []
	
	
	$('table:eq(3) td:eq(1) table>tbody>tr:gt(0)').each(function(i, entry){
  	  var item = {};
  	  // TODO handle entry-free images
  	  item.time = /\d\d\.\d\d/.exec(
  	    $('td:eq(0)',entry).text()
  	  )[0].replace('.',':').trim();
  	  var s = $('td:eq(0) img', entry)
  	  if (s.length > 0) {
  	    if (/eintrittfrei.gif$/.test(s[0].src)) {
  	      item.free = true
  	    }
  	  }

	  var location =  $('td:eq(1) b a', entry)
  	  if(location.length > 0) {
  	    item.location = location.text();
  	  } else {
	    c_geocoder++;
	    location = $('td:eq(1) b',entry)
	    console.log('getting event : '+location.text())
	    geocoder.query(location.text(), (err, data) => {
	      if(data.latlng)
		item.coordinates = data.latlng.reverse();
	      else {
		console.error("couldn't retrieve geoLocation for : ",
      			      location.text(), "recived : ",err, data);
	      }
	      c_geocoder--;
	    });
	    //filter for adress in brackets
  	  }

	  var loc = $('td:eq(1) b a',entry)[0]
	  if( loc ) {
	    var m = /adressen\.php\?loc=(\d*)/.exec(loc.href)
	    if(m)
	      item.loc = m[1];
	  }

	  $('td:eq(1) b', entry).remove();
  	  m =  /:(.*?)<br>(.*)/.exec(
  	    $('td:eq(1) span',entry).html());
  	  item.type = m[1].trim();
  	  item.desc = m[2].trim();
	  
  	  events.push(item)
	});

	var f = function() {
	  if (c_geocoder > 0) {
	    console.log('.')
	    setTimeout(f,500);
	    return
	  }
	  fs.writeFile('./tst-events.json',
      		       JSON.stringify(events, null, 2),
		       'utf-8',
      		       (err) => {
      			 if (err) throw err;
      			 console.log('Saved Events : '+ events.length +' items found.');
      		       });
	};
	f()	
      });
  }

  todo = {
    './data/termine.html' : get_events,
    // './data/kuefa.html' : get_vokues,
    // './data/adressen.html' : get_stressis
  }
  for ( fname in todo ) {
    var txt = fs.readFileSync(fname);
    var html = iconv.convert(txt).toString();
    todo[fname](html);
  }
  
}());

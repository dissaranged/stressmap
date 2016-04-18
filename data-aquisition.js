const fs = require('fs');
(function () {
  var jsdom = require('jsdom');
  var Iconv = require('iconv').Iconv
  var iconv = new Iconv('ISO-8859-15', 'UTF-8');
  var geocoder = require('geocoder')
  var stressis = [];
  var vokues = {};
  var events = [];
  
                  // Stressfaktoren
  var fixings = {'Scherer8': {address: 'Schererstr 8, 13347 Berlin'},
		 'Rosa Rose': {address: 'Jessnerstr. 3, 10247 Berlin'},
		 'Babylonia': {address: 'Cuvrystr. 21, 10997 Berlin'},
		 'Scharni 38': {address: 'Scharnweberstr. 38, 10247 Berlin'},
		 // KueFas
		 'Groni50':  { name: "Groni50 (Wedding)" },
		 'FE61': { name: "FREE e.V." },
		 'Kreutziger 19': {name: "K19 Café"},
		 'KvU': {"name": "KvU (Kirche von Unten)"},
		 "Köpi": {"name": "KvU (Kirche von Unten)"},
		 "New Yorck (im Bethanien)": {"name": "New Yorck im Bethanien"},
		 "Projektraum": {"name": "Projektraum H48 (Neukölln)"},
		 "Scherer 8": {"name": "Scherer8"},
		 "Thommy-Weißbecker-Haus": {"name": "Tommy-Weisbecker-Haus"},
		 // Events
		 "address": "Gemeinschaftsgarten am Bethaniendamm":{
		   "address": "Bethaniendamm Berlin"
		 },
		 "address": "Jugendclub Liebig 19": {
		   "address": "Liebigstraße 19 Berlin",
		 }
		};

  var faulty_ones = []
  var geo_c = 0;
  function geocode_this(ary, allDone) {
    var timeout = 300;
    if (ary == [])
      allDone();
    geo_c++;
    console.log('starting geocoder for ', ary.length, 'elements ########')
    function gotOne(i) {
      console.log('gotOne')
      if(++i < ary.length){
      	getOne(i);
      } else {
      	console.log('retrieved all geoData');
	geo_c--;
      	allDone();
      }
    };
	
    function getOne(i) {
            
      var item = ary[i];
      console.log('retriving coordinates for '+item.name,item.address)
      var c = 0;
      
      var callback = function (err, data) {
	if (err) {
	  console.error("couldn't retrieve geoLocation for : ",
      			address, "recived : ",  err);
	  faulty_ones.push(item);
	} else {
	  if (data.status === "OVER_QUERY_LIMIT") {
	    console.log(JSON.stringify(data))
	    console.log('servers not liking us right now, wait ... ')
	    setTimeout(gotOne.bind(null, i-1), timeout += 10);
	    return;
	  } else if (data.status === "ZERO_RESULTS"){
	    if ( c == 0) 
	      var address = item.address.replace(/\([^)]*\)/g, '').trim();
	    else if( c == 1) {
	      var m = (/\(([^)]*)\)/g).exec(item.address);
	      if(m)
		address = m[1].trim();
	    }
	    if (c < 2) {
	      c++;
	      console.log('fixing address (', c , ') : ', address);
	      geocoder.geocode(address, callback);
	    } else {
	      faulty_ones.push(item);
	    }
	    return;
	  } else if(data && typeof data.results == 'object' && typeof data.results[0] == 'object' && data.results[0].geometry) {
	    item.coordinates = [
	      data.results[0].geometry.location.lng,
	      data.results[0].geometry.location.lat
	    ];
	  } else {
	    faulty_ones.push(item);
	    console.error('Error in geocoder : ', JSON.stringify(item, null, 2), JSON.stringify(data, null, 2));
	  }
	}
	gotOne(i);
      }
      
      geocoder.geocode(item.address, callback);
    }
    getOne(0)
  }

  
  // Get VoKues
  function get_vokues(html) {
    jsdom.env(
      html,
      ["http://code.jquery.com/jquery.js"],
      function (err, window) {
	const $ = window.jQuery
		
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
    var promise = new Promise(function(resolve, reject) {
      jsdom.env(
	//"http://stressfaktor.squat.net/adressen.php",
	html, ["http://code.jquery.com/jquery.js"],
	function(err, window) {
	  const $ = window.jQuery
	  
	  //var stressis = [];
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
	  
	  
	  function allDone() {
	    console.log('AllDone')
      	    fs.writeFile('./tst-stressfaktoren.json',
      			 JSON.stringify(stressis, null, 2),
      			 'utf-8',
      			 (err) => {
      			   if (err) throw err;
      			   console.log('Saved Addresses : '+ stressis.length +' items found.');
      			 });
	  }
	  //geoCoding
	  geocode_this(stressis, allDone);
	});
    });
    return promise;
  }

  function get_events(html) {
    var promise = new Promise(function(resolve, reject) {
      jsdom.env(
	//"http://stressfaktor.squat.net/adressen.php",
	html,
	["http://code.jquery.com/jquery.js"],
	{encoding: 'binary'},
	function(err, window) {
	  var $ = window.jQuery;

	  var c_geocoder = 0;
	  
	  var m = /(\d+)\.(\d+)\.(\d+)/.exec($('table:eq(3) td:eq(1) table>tbody>tr:eq(0) span').text())
	  var date = new Date(parseInt(m[3]),parseInt(m[2])-1,parseInt(m[1]))

	  $('table:eq(3) td:eq(1) table>tbody>tr:gt(0)').each(function(i, entry){
	    //console.log("------------------------\n",entry.outerHTML)
	    console.log("-->",$('td:eq(0)',entry).text())
	    var item = {date: date};
  	    // TODO handle entry-free images
  	    var m = item.time = /\d\d?.\d\d/.exec(
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
	      item.address = $('td:eq(1) b',entry).text();
	      item.location = $('td:eq(1) b',entry).html();
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
	  console.log('resolving events ')
	  resolve()
	});
    });
    return promise
  }


  
  todo = {
    // './data/termine.html' : get_events,
    // './data/kuefa.html' : get_vokues,
    // './data/adressen.html' : get_stressis
  }
  fs.readdirSync('./data/').filter( i => {
    return /termine.php/.test(i)}).reduce( (cary, item) => {
      todo['./data/'+item] = get_events
      return cary;
    }, todo)

  function done_print(){
    if ( geo_c > 0 ) {
      setTimeout(done_print,1000);
      return
    }
    console.log('Errors in geoCoding  : ', JSON.stringify(faulty_ones,null, 2));
    console.log(' stressis : ', stressis.length);
    console.log(' vokues : ', Object.keys(vokues).length);
    console.log(' events : ', events.length);
  }

  //geoCoding events
  function allDone() {
    fs.writeFile('./tst-events.json',
      		 JSON.stringify(events, null, 2),
		 'utf-8',
      		 (err) => {
      		   if (err) throw err;
      		   console.log('Saved Events : '+ events.length +' items found.');
      		 });
    done_print();
  }
  
  console.log('creating promise')
  var loop = new Promise( function(resolve, reject) {
    var c = 1;
    for ( fname in todo ) {
      console.log('.');
      var txt = fs.readFileSync(fname);
      var html = iconv.convert(txt).toString();
      todo[fname](html).then(function() {
	console.log('then  :',c)
	if (c == Object.keys(todo).length)
	  resolve()
	else
	  c++;
      });
    }
    console.log('after loop');
  }).then(function() {
    geocode_this(
      events.reduce( (ret, item) => {
	if(item.address)
  	  ret.push(item);
	return ret;
      }, []),
      allDone );
  })
    
}());

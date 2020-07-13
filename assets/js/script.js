var rentListArr = []; // this array hold all houses returned by Realtor API for user entered zip, city and state(also optional radius) 
var map; // used by google maps
var directionsService; // used by google maps
var directionsRenderer; // used by google maps
var oldDirectionRenderer;
var favorites = []; // creates an array that saves info in localStorage
if(localStorage.getItem("favorites")){
    favorites = (JSON.parse(localStorage.getItem("favorites"))) || [];
    console.log(favorites);
    if(favorites.length > 0){
        favorites.forEach(function(el, i){
            var favDiv = document.createElement("div");
            favDiv.setAttribute("class", "favDiv");
            var favImg = document.createElement("img");
            favImg.setAttribute("class", "favImg");
            favImg.setAttribute("src", el.photos[0].href);
            var favAddress = document.createElement("p");
            favAddress.setAttribute("class", "favAddress");
            favAddress.textContent= el.line + ", " + el.city + ", " + el.state;
            favDiv.appendChild(favImg);
            favDiv.appendChild(favAddress);
            console.log(favAddress);
            
            document.querySelector(".favoritesList").appendChild(favDiv);
        });
    }
}

// var elem = new Foundation.Sticky(element, options);
// API to get list of houses by zip code, city, state and radius
// It searches only single_family houses
// It saves fetched results to local Storage 
var getHousesList = function(postal_code, city, state_code, radius){

    //errorEl.innerHTML="";

    var apiUrl = "https://realtor.p.rapidapi.com/properties/v2/list-for-rent?prop_type=single_family&sort=relevance";
    if (radius)
        apiUrl = apiUrl + "&radius=" + radius;
    apiUrl = apiUrl + "&postal_code=" + postal_code + "&city=" + city + "&state_code=" + state_code + "&limit=200&offset=0";
    console.log(apiUrl);

    fetch(apiUrl, {
        "method": "GET",
        "headers": {
            "x-rapidapi-host": "realtor.p.rapidapi.com",
            "x-rapidapi-key": "14ac62fbb2mshd58e729e7b4f36ep1704c5jsn9ba276807be6"
        }
    })
    .then(response => {
        if (response.ok) {
            response.json().then(function(data){
                console.log(data);
                rentListArr = [];
                for (i=0; i< data.meta.returned_rows; i++){
                    var house = {
                        city : data.properties[i].address.city,
                        county: data.properties[i].address.county,
                        lat: data.properties[i].address.lat,
                        lon: data.properties[i].address.lon,
                        postal_code : data.properties[i].address.postal_code,
                        line : data.properties[i].address.line,
                        state: data.properties[i].address.state,
                        baths: data.properties[i].baths,
                        beds: data.properties[i].beds,
                        building_size : data.properties[i].building_size.size, 
                        building_size_units : data.properties[i].building_size.units, 
                        price : data.properties[i].price,
                        year_built: data.properties[i].year_built,
                        photos : data.properties[i].photos
                    }

                    rentListArr.push(house);
                }

                localStorage.setItem("FetchedHouses", JSON.stringify(rentListArr));
                initMap();
                document.querySelector("#value-btn").style.cursor = "pointer";
            })
        }
        else {
            //displayError(response.statusText);
            console.log(response.statusText);
        }
    })
    .catch(err => {
        console.log(err);
        //displayError("Unable to connect to the server.");
    });
}

//Read the Houses List from the Local Storage
var readHousesList = function(){
    var listItems = localStorage.getItem("FetchedHouses");
    if (listItems){
        rentListArr = JSON.parse(listItems);
    }
}



//Add one marker on the map
var addOneMarker = function(markerLatLng, houseInfo){
    var imageIcon = {
        url: "https://img.icons8.com/doodle/48/000000/home--v1.png", 
        scaledSize: new google.maps.Size(30, 30)
    };
    console.log(houseInfo);
    var infoWindowDiv = document.createElement("div");
    infoWindowDiv.setAttribute("data-lat", markerLatLng.lat);
    infoWindowDiv.setAttribute("data-lng", markerLatLng.lng);
    var href = "#";
    if (houseInfo.photos[0])
        href = houseInfo.photos[0].href;
    infoWindowDiv.innerHTML = "<img class='float-center marginBottom iconImage' src = '" + href + "' alt= '" + houseInfo.line + "' />" +
    "<p class='pInfoWindow' >$" + houseInfo.price + "</p>" + 
    "<p class='pInfoWindow' >" + houseInfo.line + ", " + houseInfo.city + ", " + houseInfo.state + "</p>" + 
    "<p class='pInfoWindow' >" + houseInfo.beds + " bd / " + houseInfo.baths + " ba / " + houseInfo.building_size + " " + houseInfo.building_size_units + "</p>" +
    "<a class='button primary small float-center marginTop' href='#'> Take me here </a> <a class='button alert small float-bottom marginTop' id='saveInfo' data='"+JSON.stringify(houseInfo)+"' href='#'>Add to Favorites</a> <a class='button success small float-bottom-right marginTop' href='#'>Add to Visit List</a>"; 
    

    var infowindow = new google.maps.InfoWindow({
        enableEventPropagation: true
    });
    infowindow.setContent(infoWindowDiv);

    var marker = new google.maps.Marker({
        position: markerLatLng,
        map: map,
        title: "Address: " + houseInfo.line + "; Price: $" + houseInfo.price,
        icon: imageIcon
      });
    marker.addListener("click", function(){
        infowindow.open(map,marker);
    });

    google.maps.event.addDomListener(infoWindowDiv, 'click', function(event){
        console.log(event.target.id);
        if (event.target.className.includes("button primary small"))
            calcRoute({lat: parseFloat(event.target.closest("div").getAttribute("data-lat")), 
                    lng: parseFloat(event.target.closest("div").getAttribute("data-lng")) });
        if (event.target.id == "saveInfo") {
            favorites.push(JSON.parse(event.target.getAttribute("data")));
            console.log(favorites);
            localStorage.setItem("favorites",JSON.stringify(favorites));
        }
    } );
}




//Read Houses List from Local Storage and put them on the map
var addMarkers = function(){

    if (rentListArr.length==0)
        readHousesList();

    if (rentListArr.length > 0){

        // coordinates to center the map on - calculated in the for loop
        var coords = {
            lat : 0,
            lng : 0
        }

        for (i=0; i< rentListArr.length; i++ ){
            var markerLatLng = { lat: rentListArr[i].lat, lng: rentListArr[i].lon };
    
            coords.lat += rentListArr[i].lat;
            coords.lng += rentListArr[i].lon;
    
            addOneMarker(markerLatLng, rentListArr[i]);
        }
    
        coords.lat = coords.lat / rentListArr.length;
        coords.lng = coords.lng / rentListArr.length;
    }
    else // center on the downtown Austin
        var coords = {
            lat : 30.2729,
            lng : -97.7444
        }

    
    return coords;
}

// Calculate Route and put it on the map
var calcRoute = function(destCoord){

    if (oldDirectionRenderer)
        oldDirectionRenderer.setMap(null);

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    if (navigator.geolocation){
        navigator.geolocation.getCurrentPosition(function(position){
            var currentLocation = {
                lat : position.coords.latitude, lng : position.coords.longitude
            };

            var request = {
                origin : currentLocation,
                destination : destCoord,
                travelMode : 'DRIVING'
            };
        
            directionsService.route(request, function(result, status){
                if (status == 'OK'){
                    directionsRenderer.setDirections(result);
                }
            });
        
        });
    }
    else
        console.log("Browser does not support Geolocation!");

    oldDirectionRenderer = directionsRenderer;
}

// Initialize map
var initMap = function(coordinates, houseInfo) {

    var script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyD2bb0Fylaw4UA6pfhINwxIWBRN39ggjYc&callback=initMap";
    script.defer = true;
    script.async = true;

    window.initMap = function(){
        map = new google.maps.Map(document.getElementById("map"),{
            zoom : 15
        });

        map.setCenter(addMarkers());
    }

    document.head.appendChild(script);
}

$( ".button" ).click(function( event ) {
        event.preventDefault();        
        var searchCity = document.querySelector("#search-city").value;
        var searchState = document.querySelector("#search-state").value;
        var searchZipcode = document.querySelector("#search-zipcode").value;
        var btnEl = document.querySelector("#value-btn");
        btnEl.style.cursor = "progress";
        getHousesList(searchZipcode, searchCity, searchState);
});

// call to put multiple listings on the map; list of houses is taken from the local storage
initMap(); 

// call to get rental houses list for zip code, city and state (and optional radius); the list is saved to local storage;
//getHousesList(78727,'Austin','TX'); var elem = new Foundation.Sticky(element, options);
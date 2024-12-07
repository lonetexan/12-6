// map.js

let map;
let placesService;
let markers = [];
let infoWindow;
let apartmentsList;
let pagination = null;
let lastSearchCenter = null;
let lastZoomLevel = null;

const radiusInMeters = 16000; // about 10 miles

window.initMap = function() {
  console.log("Initializing map...");
  let initialLat = parseFloat(sessionStorage.getItem('initialCenterLat')) || 30.2672; // Default to Austin, TX
  let initialLng = parseFloat(sessionStorage.getItem('initialCenterLng')) || -97.7431;

  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: initialLat, lng: initialLng },
    zoom: 13,
    disableDefaultUI: false,
    gestureHandling: "greedy"
  });

  placesService = new google.maps.places.PlacesService(map);
  apartmentsList = document.getElementById('apartmentsList');
  infoWindow = new google.maps.InfoWindow();

  const input = document.getElementById('pac-input');
  const autocompleteOptions = {
    fields: ["geometry", "name"]
  };
  const autocomplete = new google.maps.places.Autocomplete(input, autocompleteOptions);
  autocomplete.bindTo('bounds', map);

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    console.log("Map search place changed:", place);
    if (!place.geometry || !place.geometry.location) return;
    map.setCenter(place.geometry.location);
    map.setZoom(13);
    maybeSearch();
  });

  map.addListener('idle', () => {
    maybeSearch();
  });

  maybeSearch();
};

// Function to recenter map, called from main.js
window.recenterMap = function(lat, lng) {
  if (!map) {
    console.error("Map not initialized yet.");
    return;
  }

  const newCenter = { lat: lat, lng: lng };
  map.setCenter(newCenter);
  map.setZoom(13);
  maybeSearch();
}

function maybeSearch() {
  if (!map) return;

  const currentCenter = map.getCenter();
  const currentZoom = map.getZoom();

  if (currentZoom < 13) {
    clearApartmentsList();
    clearMarkers();
    return;
  }

  if (shouldSearchAgain(currentCenter, currentZoom)) {
    lastSearchCenter = currentCenter;
    lastZoomLevel = currentZoom;
    initialSearch(currentCenter);
  }
}

function shouldSearchAgain(center, zoom) {
  if (!lastSearchCenter || lastZoomLevel === null) return true;
  if (zoom !== lastZoomLevel) return true;

  const latDiff = Math.abs(center.lat() - lastSearchCenter.lat());
  const lngDiff = Math.abs(center.lng() - lastSearchCenter.lng());
  return (latDiff > 0.005 || lngDiff > 0.005);
}

function initialSearch(center) {
  console.log("Searching apartments at center:", center.toString());
  clearApartmentsList();
  clearMarkers();

  const request = {
    location: center,
    radius: radiusInMeters,
    keyword: 'apartment OR condo OR student housing'
  };

  placesService.nearbySearch(request, handleSearchResults);
}

function handleSearchResults(results, status, pag) {
  console.log("Search results:", results, status);
  if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
    displayApartments(results);
    pagination = pag;
    if (pagination && pagination.hasNextPage) {
      setTimeout(() => pagination.nextPage(), 2000);
    }
  } else {
    console.log("No apartments found in this area.");
    clearApartmentsList();
  }
}

function displayApartments(places) {
  places.forEach((place) => {
    const detailsRequest = {
      placeId: place.place_id,
      fields: ['name', 'photos', 'vicinity', 'website', 'geometry', 'place_id']
    };

    placesService.getDetails(detailsRequest, (details, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && details) {
        addApartmentMarker(details);
        addApartmentToList(details);
      } else {
        // Fallback if details request fails
        addApartmentMarker(place);
        addApartmentToList(place);
      }
    });
  });
}

function addApartmentMarker(details) {
  const marker = new google.maps.Marker({
    position: details.geometry.location,
    map: map,
    title: details.name
  });
  markers.push(marker);

  marker.addListener('click', () => {
    let contentString = `
      <div style="color:#000;">
        <h2>${details.name}</h2>
        <p><strong>Address:</strong> ${details.vicinity || 'N/A'}</p>
    `;

    if (details.website) {
      contentString += `<p><a href="${details.website}" target="_blank" rel="noopener">Website</a></p>`;
    }

    if (details.photos && details.photos.length > 0) {
      const photoUrl = details.photos[0].getUrl({ maxWidth: 300 });
      contentString += `
        <div style="margin-top: 10px;">
          <img src="${photoUrl}" alt="Apartment Photo" style="max-width:100%; height:auto; border-radius:5px;">
        </div>
      `;
    }

    contentString += `</div>`;
    infoWindow.setContent(contentString);
    infoWindow.open(map, marker);
  });

  return marker;
}

function showError(message) {
  const errorContainer = document.getElementById('errorMessageContainer');
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';

  setTimeout(() => {
    errorContainer.style.display = 'none';
  }, 3000);
}

async function addApartmentToList(details) {
  const apartmentsList = document.getElementById('apartmentsList');
  if (!apartmentsList) {
    console.error("apartmentsList element not found");
    return;
  }

  const li = document.createElement('li');
  li.className = 'apartment-item';
  li.style.marginBottom = '10px';

  let photoHtml = '';
  let photoUrl = '';
  if (details.photos && details.photos.length > 0) {
    photoUrl = details.photos[0].getUrl({ maxWidth: 200 });
    photoHtml = `<img src="${photoUrl}" alt="${details.name}" style="max-width:100%; border-radius:5px;"/>`;
  }

  let websiteHtml = '';
  if (details.website) {
    websiteHtml = `<a href="${details.website}" target="_blank">Visit Website</a><br>`;
  }

  li.innerHTML = `
    <strong>${details.name}</strong><br>
    ${details.vicinity || 'Address not available'}<br>
    ${photoHtml}
    ${websiteHtml}
  `;

  if (window.currentUser) {
    const saveBtn = document.createElement('button');
    saveBtn.innerText = 'Save';
    saveBtn.style.marginTop = '5px';
    saveBtn.style.padding = '5px 10px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.background = '#28a745';
    saveBtn.style.color = '#fff';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '3px';
    saveBtn.style.transition = 'background 0.3s ease';
    saveBtn.onmouseover = () => { saveBtn.style.background = '#218838'; };
    saveBtn.onmouseout = () => { saveBtn.style.background = '#28a745'; };
    saveBtn.addEventListener('click', () => {
      saveApartmentToSupabase({
        place_id: details.place_id,
        name: details.name,
        vicinity: details.vicinity,
        website: details.website || '',
        photo_url: photoUrl,
        rating: 0
      });
    });
    li.appendChild(saveBtn);
  } else {
    const loginPrompt = document.createElement('p');
    loginPrompt.style.color = 'red';
    loginPrompt.textContent = 'Log in to save apartments.';
    li.appendChild(loginPrompt);
  }

  apartmentsList.appendChild(li);
}

function clearApartmentsList() {
  const apartmentsList = document.getElementById('apartmentsList');
  if (apartmentsList) {
    apartmentsList.innerHTML = '';
  }
}

function clearMarkers() {
  for (const marker of markers) {
    marker.setMap(null);
  }
  markers = [];
}

// Save Apartment to Supabase
async function saveApartmentToSupabase(apartment) {
  if (!window.currentUser) {
    showError("You must be logged in to save apartments.");
    return;
  }

  try {
    const { error } = await supabase
      .from('saved_apartments')
      .upsert({
        user_id: window.currentUser.id,
        place_id: apartment.place_id,
        name: apartment.name,
        vicinity: apartment.vicinity,
        website: apartment.website,
        photo_url: apartment.photo_url,
        rating: apartment.rating
      }, { onConflict: 'user_id,place_id' });

    if (error) {
      console.error("Error saving apartment:", error);
      showError("Error saving apartment: " + error.message);
    } else {
      showError("Apartment saved successfully!");
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    showError("An unexpected error occurred while saving the apartment.");
  }
}

// Fetch and Display Saved Apartments
async function displaySavedApartments() {
  const savedList = document.getElementById('savedApartmentsList');
  if (!savedList) {
    console.error("savedApartmentsList element not found");
    return;
  }

  savedList.innerHTML = '';

  if (!window.currentUser) {
    savedList.innerHTML = '<p>Please log in to see your saved apartments.</p>';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('saved_apartments')
      .select('*')
      .eq('user_id', window.currentUser.id);

    if (error) {
      console.error("Error fetching saved apartments:", error);
      showError("Error fetching saved apartments: " + error.message);
      return;
    }

    if (data.length === 0) {
      savedList.innerHTML = '<p>No saved apartments yet.</p>';
      return;
    }

    data.forEach(apartment => {
      const li = document.createElement('li');
      li.className = 'saved-apartment-item';

      let photoHtml = '';
      if (apartment.photo_url) {
        photoHtml = `<img src="${apartment.photo_url}" alt="${apartment.name}" />`;
      }

      let websiteHtml = '';
      if (apartment.website) {
        websiteHtml = `<a href="${apartment.website}" target="_blank">Visit Website</a><br>`;
      }

      li.innerHTML = `
        <strong>${apartment.name}</strong><br>
        ${apartment.vicinity || 'Address not available'}<br>
        ${photoHtml}
        ${websiteHtml}
      `;

      // Rating Section
      const ratingContainer = document.createElement('div');
      ratingContainer.style.margin = '10px 0';
      ratingContainer.style.display = 'flex';
      ratingContainer.style.alignItems = 'center';

      const ratingLabel = document.createElement('span');
      ratingLabel.textContent = 'Rating: ';
      ratingContainer.appendChild(ratingLabel);

      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.innerText = '★';
        star.style.cursor = 'pointer';
        star.style.fontSize = '20px';
        star.style.marginRight = '5px';
        star.style.color = i <= (apartment.rating || 0) ? 'gold' : '#ccc';

        star.addEventListener('mouseover', () => {
          highlightStars(ratingContainer, i);
        });

        star.addEventListener('mouseout', () => {
          highlightStars(ratingContainer, apartment.rating || 0);
        });

        star.addEventListener('click', () => {
          updateApartmentRatingInSupabase(apartment.place_id, i);
          apartment.rating = i;
          highlightStars(ratingContainer, i);
        });

        ratingContainer.appendChild(star);
      }

      li.appendChild(ratingContainer);

      // Unsave Button
      const unsaveBtn = document.createElement('button');
      unsaveBtn.innerText = 'Unsave';
      unsaveBtn.style.padding = '5px 10px';
      unsaveBtn.style.cursor = 'pointer';
      unsaveBtn.style.background = '#dc3545';
      unsaveBtn.style.color = '#fff';
      unsaveBtn.style.border = 'none';
      unsaveBtn.style.borderRadius = '3px';
      unsaveBtn.style.transition = 'background 0.3s ease';
      unsaveBtn.onmouseover = () => { unsaveBtn.style.background = '#c82333'; };
      unsaveBtn.onmouseout = () => { unsaveBtn.style.background = '#dc3545'; };
      unsaveBtn.addEventListener('click', () => unsaveApartmentFromSupabase(apartment.place_id));
      li.appendChild(unsaveBtn);

      savedList.appendChild(li);
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    showError("An unexpected error occurred while fetching saved apartments.");
  }
}

// Update Apartment Rating in Supabase
async function updateApartmentRatingInSupabase(place_id, rating) {
  if (!window.currentUser) {
    showError("You must be logged in to rate apartments.");
    return;
  }

  try {
    const { error } = await supabase
      .from('saved_apartments')
      .update({ rating })
      .eq('user_id', window.currentUser.id)
      .eq('place_id', place_id);

    if (error) {
      console.error("Error updating rating:", error);
      showError("Error updating rating: " + error.message);
    } else {
      showError("Rating updated successfully!");
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    showError("An unexpected error occurred while updating the rating.");
  }
}

// Unsave Apartment from Supabase
async function unsaveApartmentFromSupabase(place_id) {
  if (!window.currentUser) {
    showError("You must be logged in to remove saved apartments.");
    return;
  }

  try {
    const { error } = await supabase
      .from('saved_apartments')
      .delete()
      .eq('user_id', window.currentUser.id)
      .eq('place_id', place_id);

    if (error) {
      console.error("Error removing apartment:", error);
      showError("Error removing apartment: " + error.message);
    } else {
      showError("Apartment removed successfully!");
      displaySavedApartments();
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    showError("An unexpected error occurred while removing the apartment.");
  }
}

// Highlight Stars Based on Rating
function highlightStars(container, rating) {
  const stars = container.querySelectorAll('span');
  stars.forEach((star, index) => {
    star.style.color = index < rating ? 'gold' : '#ccc';
  });
}

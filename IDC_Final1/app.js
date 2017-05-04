var config = {
	    apiKey: "AIzaSyDNnNGqXZNVT4HLePoNfT7pzBoY0aPx9HA",
	    authDomain: "web-quickstart-9622b.firebaseapp.com",
	    databaseURL: "https://web-quickstart-9622b.firebaseio.com",
	    projectId: "web-quickstart-9622b",
	    storageBucket: "web-quickstart-9622b.appspot.com",
	    messagingSenderId: "987416554859"
	  };
	  firebase.initializeApp(config);

	  //var bigOne = document.getElementById('bigOne');
	  var dbRef = firebase.database().ref().child('text');
	  dbRef.on('value', function(){
	  	console.log("here!");
	  })
	  dbRef.on('value', snap => bigOne.innerText = snap.val());

	  const preObject = document.getElementById('object');
	  const dbRefObject = firebase.database().ref().child('object');
	  dbRefObject.on('value', snap => console.log(snap.val()));//event, callback function
	  
	  //const Win2 = document.getElementById('WinState2');
	  //const dbRefObject = firebase.database().ref().child('WinState2');
	  //dbRefObject.on('value', snap =>{
	  	//preObject.innerText = JSON.stringify(snap.val(),null, 3);
	  //})

//var database = firebase.database();

/*
function writeUserData(userId, name, email, imageUrl) {
  firebase.database().ref('users/' + userId).set({
    username: name,
    email: email,
    profile_picture : imageUrl
  });
}
*/

var playersRef = firebase.database().ref("Winstate/");

playersRef.set({
   Player1: {
      status1: 0,
      time1: 0
   },
	
   Player2: {
      status2: 0,
      time2: 0
   }
});

var Player1Ref = firebase.database().ref("Winstate/Player1");

Player1Ref.update({
   "status1": 0,
   "time1":0
});

var query = firebase.database().ref("Winstate/").orderByKey();
query.once("value")
  .then(function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      // key will be "ada" the first time and "alan" the second time
      var key = childSnapshot.key;
      // childData will be the actual contents of the child
      var childData = childSnapshot.val();
      //console.log(childData);
      //console.log(childData.status1);
  });
});
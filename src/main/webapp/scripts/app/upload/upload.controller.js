/**
 * Created by Javi on 21/03/2016.
 */
'use strict';

angular.module('soundxtreamappApp').controller('UploadController',
    ['$scope', '$stateParams', '$location', '$http', 'Song', 'Playlist', 'Upload', '$timeout',
        '$state', '$log', 'Principal', 'Style', '$rootScope', 'toaster',
        function ($scope, $stateParams, $location, $http, Song, Playlist, Upload, $timeout,
                  $state, $log, Principal, Style, $rootScope, toaster) {

            Principal.identity().then(function (account) {
                $scope.account = account;
            });

            var jsmediatags = window.jsmediatags;

            $scope.stepOne = false;
            $scope.stepTwo = false;
            $scope.stepThree = false;
            $scope.percentage = 0;

            $scope.processing = false;
            $scope.uploadType = "track";
            $scope.styles = Style.query({});
            $scope.invalidFiles = [];
            $scope.filesUpload = [];
            $scope.songUploaded = false;
            $scope.uploadStart = false;
            $scope.song = {
                name: null,
                url: null,
                label: null,
                tags: null,
                artwork: null,
                description: null,
                date_posted: null,
                id: null,
                duration: null,
                banner_song: null,
                bpm: null
            };

            function jumpToThirdStep(percent) {
                $('.lines-two > .lines-two-current').animate({
                    width: percent+"%"
                },{
                    duration: 400,
                    step: function( width ){
                        if(width > 99){
                            $('.step.second_step').removeClass("current_step");
                            $('.step.third_step').addClass("current_step");
                        }
                        if(width < 1){
                            $('.step.third_step').removeClass("current_step");
                            $('.step.second_step').addClass("current_step");
                        }
                    }
                });
            }

            function jumpToSecondStep() {
                $('.lines-one > .lines-one-current').animate({
                    width: "100%"
                },{
                    duration: 400,
                    step: function( width ){
                        if(width > 99){
                            $('.step.first_step').removeClass("current_step");
                            $('.step.second_step').addClass("current_step");
                        }
                    }
                });
            }

            $scope.$watch('files', function () {

                $scope.uploadSong($scope.files);
            });

            $scope.toThreeStep = function(){
                jumpToThirdStep(100)
                $scope.stepThree = true;
                $scope.stepTwo = false;
            }

            $scope.backToSecondStep = function(){
                jumpToThirdStep(0)
                $scope.stepThree = false;
            }

            $scope.load = function (id) {
                Song.get({id: id}, function (result) {
                    $scope.song = result;
                });
            };

            var onSaveSuccess = function (result) {
                //$state.go('song.detail', {accessUrl: result.access_url,user: result.user.login, id: result.id}, null);
                $state.go('song',null, {reload:true});
                toaster.pop('success', "Success", "Song uploaded!");
            };

            var onSaveError = function (result) {
                $scope.isSaving = false;
            };
            $scope.save = function () {
                $scope.isSaving = true;
                $scope.song.date_posted = new Date();
                if ($scope.song.id != null) {
                    Song.update($scope.song, onSaveSuccess, onSaveError);
                } else {
                    console.log($scope.picFile);
                    if ($scope.picFile == undefined && ($scope.artworkFile == undefined || $scope.artworkFile == null)) {
                        //$scope.uploadArt($scope.artworkFile);
                        $scope.song.artwork = $rootScope.account.user_image;
                    } else {
                        if($scope.artworkFile != null && ($scope.croppedArtwork == undefined || $scope.croppedArtwork == "")){
                            var blob = dataURItoBlob($scope.artworkFile);
                            var file = new File([blob], "ds.jpg");
                            $scope.uploadArt(file);
                        }
                        else{
                            var imageBase64 = $scope.croppedArtwork;
                            var blob = dataURItoBlob(imageBase64);
                            var file = new File([blob], "ds.jpg");

                            $scope.uploadArt(file);
                        }
                    }
                    if ($scope.bannerFile != undefined) {
                        var imageBase64Banner = $scope.croppedBanner;
                        var blobBanner = dataURItoBlob(imageBase64Banner);
                        var fileBanner = new File([blobBanner], "ds2.jpg");
                        //$scope.uploadArt($scope.artworkFile);

                        $scope.uploadBanner(fileBanner);
                    } else {
                        saveAfterUpload();
                    }
                }
            };

            function saveAfterUpload() {
                $scope.song.date_posted = new Date();
                Song.save($scope.song, onSaveSuccess, onSaveError);
            }

            function dataURItoBlob(dataURI) {
                var binary = atob(dataURI.split(',')[1]);
                var array = [];
                for (var i = 0; i < binary.length; i++) {
                    array.push(binary.charCodeAt(i));
                }
                return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
            }

            $scope.uploadArt = function (file) {
                $scope.formUpload = true;
                if (file != null) {
                    uploadUsingUploadArtwork(file)
                }
            };

            $scope.uploadBanner = function (file) {
                if (file != null) {
                    uploadBannerSong(file)
                }
            }

            function uploadBannerSong(file) {
                var songArtworkName = file.name.toLowerCase();
                var ext = file.name.split('.').pop();

                function randomString(length, chars) {
                    var result = '';
                    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
                    return result;
                }

                var rString = "bannerSong-" + randomString(15, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') + "." + ext;
                //$scope.song.banner_song = "uploads/" + rString;

                Upload.upload({
                    url: 'api/upload',
                    data: {file: file, name: rString}
                }).then(function (resp) {

                    console.log('Success ' + resp.config.data.file.name + 'uploaded. Response: ' + resp.data);
                    $scope.song.banner_song = "uploads/" + rString;
                    saveAfterUpload();
                }, function (resp) {
                    console.log('Error status: ' + resp.status);
                }, function (evt) {
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                    console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
                });


            };

            function uploadUsingUploadArtwork(file) {
                var songArtworkName = file.name.toLowerCase();
                var ext = file.name.split('.').pop();

                function randomString(length, chars) {
                    var result = '';
                    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
                    return result;
                }

                var rString = "artwork-" + randomString(15, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') + "." + ext;
                $scope.song.artwork = "uploads/" + rString;

                Upload.upload({
                    url: 'api/upload',
                    data: {file: file, name: rString}
                }).then(function (resp) {

                    console.log('Success ' + resp.config.data.file.name + 'uploaded. Response: ' + resp.data);
                    $scope.song.artwork = "uploads/" + rString;

                }, function (resp) {
                    console.log('Error status: ' + resp.status);
                    console.log(resp);
                }, function (evt) {
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                    console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
                });


            };


            $scope.checkedMultiple = false;

            //Upload Song File

            $scope.uploadOK = false;
            $scope.uploadStart = false;



            /*function dataURItoBlob(dataURI, callback) {
                // convert base64 to raw binary data held in a string
                // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
                var byteString = window.atob(dataURI.split(',')[1]);

                // separate out the mime component
                var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

                // write the bytes of the string to an ArrayBuffer
                var ab = new ArrayBuffer(byteString.length);
                var ia = new Uint8Array(ab);
                for (var i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }

                // write the ArrayBuffer to a blob, and you're done
                //var bb = new Blob([ab]);
                var url = URL.createObjectURL(new Blob([ab] , {type:'image/jpg'}));
                return url;
            }*/

            function blobToFile(theBlob, fileName){
                //A Blob() is almost a File() - it's just missing the two properties below which we will add
                theBlob.lastModifiedDate = new Date();
                theBlob.name = fileName;
                return theBlob;
            }

            $scope.artworkFile = null;

            $scope.uploadSong = function (files) {
                $scope.filesUpload = files;
                if (files != null) {

                    jsmediatags.read(files[0], {
                        onSuccess: function(tag) {
                            var tags = tag.tags;
                            console.log(tags);
                           // $scope.song.name = tags.title;

                            var image = tags.picture;
                            if (image) {


                                var base64String = "";
                                for (var i = 0; i < image.data.length; i++) {
                                    base64String += String.fromCharCode(image.data[i]);
                                }
                                var base64 = "data:image/jpeg;base64," +
                                    window.btoa(base64String);

                                var contentType = 'image/jpg';

                                var url = dataURItoBlob(base64);
                                console.log(url);

                                $scope.artworkFile = base64;
                                $scope.picFile = url;

                                document.getElementById('picture').setAttribute('src',base64);
                            } else {
                                //document.getElementById('picture').style.display = "none";
                            }

                        }
                    });

                    if($scope.artworkFile != null){
                        $scope.picFile = $scope.artworkFile;
                    }

                    uploadUsingUpload(files[0]);
                    var accURL = (files[0].name.replace(/\s/g,"")).replace("(","-");
                    accURL = accURL.replace(")","").toLowerCase();
                    accURL = accURL.replace( /\.[^/.]+$/ ,"");

                    Song.getTracksUser({},function(res) {

                        console.log(res);

                        var acc2 = accURL, i, ex;
                        for (var k = 0; k < res.length; k++) {
                            i = 0;
                            while (res[k].access_url == acc2) {
                                ex = true;
                                i++;
                                acc2 = accURL + "" + i;
                            }
                        }

                        if (ex)
                            accURL = accURL + "" + i;

                        $scope.song.access_url = accURL;
                    });
                }
            };
            var upload;

            function uploadUsingUpload(file) {
                var songLocationName = "";
                console.log(file);

                    $scope.song.name = file.name;
                    songLocationName = file.name.toLowerCase();
                    songLocationName = songLocationName.split(' ').join('-');
                    songLocationName = $scope.account.login + "-" + songLocationName;


                var songArtworkName = file.name.toLowerCase();
                var ext = file.name.split('.').pop();

                upload = Upload.upload({
                    url: 'api/upload',
                    data: {file: file, 'name': songLocationName}
                });
                upload.then(function (resp) {
                    Upload.mediaDuration(file).then(function (durationInSeconds) {
                        $scope.song.duration = durationInSeconds;
                        if(durationInSeconds < 1200){
                            $scope.getBPM(file);
                        }
                    });
                    $scope.song.url = "uploads/" + songLocationName;


                }, function (resp) {
                    console.log('Error status: ' + resp.status);
                }, function (evt) {
                    $scope.uploadStart = true;
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total)
                    file.progress = Math.min(100, parseInt(100.0 *
                        evt.loaded / evt.total));
                    $scope.percentage = progressPercentage;
                    if(progressPercentage == 100){
                        $timeout(function(){
                            jumpToSecondStep();
                            $scope.stepOne = true;
                        },1000);
                    }
                });
            }

            $scope.cancelUploadSong = function () {
                upload.abort();
                toaster.pop('warning', "Whoops!!", "Upload canceled");
                $state.go('upload', null, null);
            }

            $scope.getBPM = function (file) {
                var fileTrack = file;
                var reader = new FileReader();
                var text = "";
                $scope.processing = true;
                var context = new (window.AudioContext || window.webkitAudioContext)();
                reader.onload = function () {
                    // Create offline context
                    var OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
                    var offlineContext = new OfflineContext(1, 2, 44100);

                    offlineContext.decodeAudioData(reader.result, function (buffer) {
                        // Create buffer source
                        var source = offlineContext.createBufferSource();
                        source.buffer = buffer;

                        // Create filter
                        var filter = offlineContext.createBiquadFilter();
                        filter.type = "lowpass";

                        // Pipe the song into the filter, and the filter into the offline context
                        source.connect(filter);
                        filter.connect(offlineContext.destination);

                        // Schedule the song to start playing at time:0
                        source.start(0);

                        var peaks,
                            initialThresold = 0.9,
                            thresold = initialThresold,
                            minThresold = 0.3,
                            minPeaks = 30;

                        do {
                            peaks = getPeaksAtThreshold(buffer.getChannelData(0), thresold);
                            thresold -= 0.05;
                        } while (peaks.length < minPeaks && thresold >= minThresold);

                        var intervals = countIntervalsBetweenNearbyPeaks(peaks);

                        var groups = groupNeighborsByTempo(intervals, buffer.sampleRate);

                        var top = groups.sort(function (intA, intB) {
                            return intB.count - intA.count;
                        }).splice(0, 5);
                        $scope.song.bpm = Math.round(top[0].tempo);
                        text = '<div id="guess">Guess for track <strong>NIGGA</strong> by ' +
                            '<strong>YOH</strong> is <strong>' + Math.round(top[0].tempo) + ' BPM</strong>' +
                            ' with ' + top[0].count + ' samples.</div>';
                        //console.log(text);
                        $scope.processing = false;
                    });

                };
                reader.readAsArrayBuffer(fileTrack);
            }

            function getPeaksAtThreshold(data, threshold) {
                var peaksArray = [];
                var length = data.length;
                for (var i = 0; i < length;) {
                    if (data[i] > threshold) {
                        peaksArray.push(i);
                        // Skip forward ~ 1/4s to get past this peak.
                        i += 10000;
                    }
                    i++;
                }
                return peaksArray;
            }

            function countIntervalsBetweenNearbyPeaks(peaks) {
                var intervalCounts = [];
                peaks.forEach(function (peak, index) {
                    for (var i = 0; i < 10; i++) {
                        var interval = peaks[index + i] - peak;
                        var foundInterval = intervalCounts.some(function (intervalCount) {
                            if (intervalCount.interval === interval)
                                return intervalCount.count++;
                        });
                        if (!foundInterval) {
                            intervalCounts.push({
                                interval: interval,
                                count: 1
                            });
                        }
                    }
                });
                return intervalCounts;
            }

            function groupNeighborsByTempo(intervalCounts, sampleRate) {
                var tempoCounts = [];
                intervalCounts.forEach(function (intervalCount, i) {
                    if (intervalCount.interval !== 0) {
                        // Convert an interval to tempo
                        var theoreticalTempo = 60 / (intervalCount.interval / sampleRate );

                        // Adjust the tempo to fit within the 90-180 BPM range
                        while (theoreticalTempo < 90) theoreticalTempo *= 2;
                        while (theoreticalTempo > 180) theoreticalTempo /= 2;

                        theoreticalTempo = Math.round(theoreticalTempo);
                        var foundTempo = tempoCounts.some(function (tempoCount) {
                            if (tempoCount.tempo === theoreticalTempo)
                                return tempoCount.count += intervalCount.count;
                        });
                        if (!foundTempo) {
                            tempoCounts.push({
                                tempo: theoreticalTempo,
                                count: intervalCount.count
                            });
                        }
                    }
                });
                return tempoCounts;
            }

        }])
    .filter('bytes', function () {
        return function (bytes, precision) {
            if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
            if (typeof precision === 'undefined') precision = 1;
            var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
                number = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
        }
    })
    .filter('propsFilter', function () {
        return function (items, props) {
            var out = [];

            if (angular.isArray(items)) {
                items.forEach(function (item) {
                    var itemMatches = false;

                    var keys = Object.keys(props);
                    for (var i = 0; i < keys.length; i++) {
                        var prop = keys[i];
                        var text = props[prop].toLowerCase();
                        if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                            itemMatches = true;
                            break;
                        }
                    }

                    if (itemMatches) {
                        out.push(item);
                    }
                });
            } else {
                // Let the output be the input untouched
                out = items;
            }

            return out;
        };
    });

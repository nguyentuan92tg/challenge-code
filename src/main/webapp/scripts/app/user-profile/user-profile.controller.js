/**
 * Created by Javi on 27/03/2016.
 */
'use strict';

angular.module('soundxtreamappApp')
    .controller('UserProfileController', function ($timeout, topTracks,Playlist_user,ParseLinks, Playlist, Song_user, $scope, $rootScope, $http, $location, $state, Auth, Principal, $modal,Upload, Seguimiento,userInfo,toaster) {

        Principal.identity().then(function(account) {
            $scope.account = account;
        });

        $scope.isAuthenticated = Principal.isAuthenticated;

        $scope.isCollapsed = true;
        $scope.user = userInfo;
        $scope.playlistsUser = [];
        $scope.predicate = 'id';
        $scope.reverse = true;
        $scope.page = 0;
        $scope.totalLikes = 0;
        $scope.tracksUser = [];
        $scope.allTracksUser = [];
        $scope.topTracks = topTracks;

        $scope.user.$promise.then(function(){
            $http({
                method: 'GET',
                url: 'api/totalLikesUser/'+$scope.user.login
            }).then(function successCallback(response) {
                $scope.totalLikes = response.data;
            });
            $http({
                method: 'GET',
                url: 'api/songs/user/'+$scope.user.login
            }).then(function successCallback(response) {
                $scope.allTracksUser = response.data;
            });
            $http({
                method: 'GET',
                url: 'api/songs/newest/user/'+$scope.user.login
            }).then(function successCallback(response) {
                $scope.tracksUser = response.data;
            });
            Playlist.getPlaylistUser({login:$scope.user.login, page: $scope.page, size: 4, sort: [$scope.predicate + ',' + ($scope.reverse ? 'asc' : 'desc'), 'id']}, function(result, headers) {
                $scope.links = ParseLinks.parse(headers('link'));
                for (var i = 0; i < result.length; i++) {
                    $scope.playlistsUser.push(result[i]);
                }
            });
        });

        $scope.reset = function() {
            $scope.page = 0;
            $scope.playlists = [];
            $scope.loadAll();
        };
        $scope.loadPage = function(page) {
            $scope.page = page;
            $scope.loadAll();
        };

        $scope.share = function(id){
            Song_user.share({id: id},{},successShare);
        };

        function successShare(result) {

            for(var k = 0; k < $scope.tracksUser.length; k++){
                if($scope.tracksUser[k].song.id == result.song.id){
                    $scope.tracksUser[k].shared = result.shared;
                    if($scope.tracksUser[k].shared){
                        $scope.tracksUser[k].totalShares += 1;
                    }
                    else{
                        $scope.tracksUser[k].totalShares -= 1;
                    }
                }
            }
            if(result.shared == true){
                toaster.pop('success',"Success","Song shared to your followers");
            }
        }

        $scope.like = function(id){
            Song_user.addLike({id: id},{},successLike);
        };

        $scope.likePlaylist = function(id){
            Playlist_user.addLike({id: id},{},successLikePlaylist);
        };

        function successLikePlaylist(result) {
            for(var k = 0; k < $scope.playlistsUser.length; k++){
                if($scope.playlistsUser[k].playlist.id == result.playlist.id){
                    if($scope.playlistsUser[k].liked = result.liked){
                        $scope.playlistsUser[k].totalLikes += 1;
                    }else{
                        $scope.playlistsUser[k].totalLikes -= 1;
                    }
                }
            }
        }

        $timeout(function(){
            $(document).scroll(function() {
                var y = $(this).scrollTop();
                if (y > 300) {
                    $('.scroll-header').addClass("scroll-header-visible");
                } else {
                    $('.scroll-header').removeClass("scroll-header-visible");
                }
            });
        });

        var successLike = function(result){
            for(var k = 0; k < $scope.tracksUser.length; k++){
                if($scope.tracksUser[k].song.id == result.song.id){
                    $scope.tracksUser[k].liked = result.liked;
                    if($scope.tracksUser[k].liked){
                        $scope.tracksUser[k].totalLikes += 1;
                    }
                    else{
                        $scope.tracksUser[k].totalLikes -= 1;
                    }
                }
            }
            if(result.liked == true){
                toaster.pop('success',"Success","Song added to your favorites");
            }

        };

        $scope.follow = function(user){
            $scope.seguimiento = {
                id: null,
                seguidor: null,
                siguiendo: false,
                seguido: null,
                fecha: null
            };
            if($scope.user.followedByUser) {
                $scope.seguimiento.siguiendo = false;
            }
            else{
                $scope.seguimiento.siguiendo = true;
            }
            $scope.seguimiento.seguido = user;
            Seguimiento.save($scope.seguimiento,function(res){
                if(res.siguiendo == true){
                    $scope.user.followedByUser = true;
                    $scope.user.totalFollowers += 1;
                }
                else{
                    $scope.user.followedByUser = false;
                    $scope.user.totalFollowers -= 1;
                }
            });
        };

    });

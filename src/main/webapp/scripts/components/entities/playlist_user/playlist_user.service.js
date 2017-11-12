'use strict';

angular.module('soundxtreamappApp')
    .factory('Playlist_user', function ($resource, DateUtils) {
        return $resource('api/playlist_users/:id', {}, {
            'query': { method: 'GET', isArray: true},
            'get': {
                method: 'GET',
                transformResponse: function (data) {
                    data = angular.fromJson(data);
                    data.likedDate = DateUtils.convertDateTimeFromServer(data.likedDate);
                    data.sharedDate = DateUtils.convertDateTimeFromServer(data.sharedDate);
                    return data;
                }
            },
            'update': { method:'PUT' },
            'addLike': { method: 'POST', isArray: false, url: 'api/playlist_users/:id/like'},
            'addShare': { method: 'POST', isArray: false, url: 'api/playlist_users/:id/share'},
            'getLikesUser': { method: 'GET', isArray: true, url: 'api/playlist/likesUser/:login'}
        });
    });

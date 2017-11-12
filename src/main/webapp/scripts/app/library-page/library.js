/**
 * Created by xavi on 01/10/2016.
 */

'use strict';

angular.module('soundxtreamappApp')
    .config(function ($stateProvider) {
        $stateProvider
            .state('library', {
                parent: 'site',
                url: '/your/collections',
                data: {
                    authorities: ['ROLE_USER'],
                    pageTitle: 'global.pageTitles.your-collection'
                },
                views: {
                    'content@': {
                        templateUrl: 'scripts/app/library-page/library.html',
                        controller: 'LibraryController'
                    }
                },
                resolve: {
                    translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                        $translatePartialLoader.addPart('global');
                        return $translate.refresh();
                    }]
                }
            })
            .state('library.tracks', {
                parent: 'library',
                url: '/tracks',
                data: {
                    authorities: ['ROLE_USER'],
                    pageTitle: 'global.pageTitles.your-tracks'
                },
                views: {
                    'lib@library': {
                        templateUrl: 'scripts/app/entities/song/songs.html',
                        controller: 'SongController'
                    }
                },
                resolve: {
                    translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                        $translatePartialLoader.addPart('song');
                        $translatePartialLoader.addPart('global');
                        return $translate.refresh();
                    }]
                }
            })
            .state('library.lists.new', {
                parent: 'library.lists',
                url: '/new',
                data: {
                    authorities: ['ROLE_USER']
                },
                onEnter: ['$stateParams', '$state', '$uibModal', function($stateParams, $state, $uibModal) {
                    $uibModal.open({
                        templateUrl: 'scripts/app/entities/playlist/playlist-dialog.html',
                        controller: 'PlaylistDialogController',
                        size: 'lg',
                        resolve: {
                            entity: function () {
                                return {
                                    name: null,
                                    artwork: null,
                                    dateCreated: null,
                                    full_duration: null,
                                    id: null,
                                    banner_playlist: null,
                                    songs: []
                                };
                            }
                        }
                    }).result.then(function(result) {
                        $state.go('library.lists', null, { reload: true });
                    }, function() {
                        $state.go('library.lists');
                    })
                }]
            })
            .state('library.lists', {
                parent: 'library',
                url: '/playlists',
                data: {
                    authorities: ['ROLE_USER'],
                    pageTitle: 'global.pageTitles.your-playlists'
                },
                views: {
                    'lib@library': {
                        templateUrl: 'scripts/app/entities/playlist/playlists.html',
                        controller: 'PlaylistController'
                    }
                },
                resolve: {
                    translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                        $translatePartialLoader.addPart('playlist');
                        $translatePartialLoader.addPart('global');
                        return $translate.refresh();
                    }]
                }
            })
            .state('library.likesTracks', {
                parent: 'library',
                url: '/tracks/likes',
                data: {
                    authorities: ['ROLE_USER'],
                    pageTitle: 'global.pageTitles.your-fav-tracks'
                },
                views: {
                    'lib@library': {
                        templateUrl: 'scripts/app/entities/song_user/song_users.html',
                        controller: 'Song_userController'
                    }
                },
                resolve: {
                    translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                        $translatePartialLoader.addPart('song_user');
                        $translatePartialLoader.addPart('global');
                        return $translate.refresh();
                    }]
                }
            })
            .state('library.likesPlaylists', {
                parent: 'library',
                url: '/playlist/likes',
                data: {
                    authorities: ['ROLE_USER'],
                    pageTitle: 'global.pageTitles.your-fav-playlists'
                },
                views: {
                    'lib@library': {
                        templateUrl: 'scripts/app/entities/playlist_user/playlist_users.html',
                        controller: 'Playlist_userController'
                    }
                },
                resolve: {
                    translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                        $translatePartialLoader.addPart('playlist_user');
                        $translatePartialLoader.addPart('global');
                        return $translate.refresh();
                    }]
                }
            });
    });

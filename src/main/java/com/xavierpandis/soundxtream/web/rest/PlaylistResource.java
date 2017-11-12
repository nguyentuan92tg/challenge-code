package com.xavierpandis.soundxtream.web.rest;

import com.codahale.metrics.annotation.Timed;
import com.sun.org.apache.xpath.internal.operations.Bool;
import com.xavierpandis.soundxtream.domain.*;
import com.xavierpandis.soundxtream.repository.*;
import com.xavierpandis.soundxtream.repository.search.PlaylistSearchRepository;
import com.xavierpandis.soundxtream.security.SecurityUtils;
import com.xavierpandis.soundxtream.service.DateDiffService;
import com.xavierpandis.soundxtream.web.rest.dto.ActivityDTO;
import com.xavierpandis.soundxtream.web.rest.dto.PlaylistDTO;
import com.xavierpandis.soundxtream.web.rest.dto.SongDTO;
import com.xavierpandis.soundxtream.web.rest.util.HeaderUtil;
import com.xavierpandis.soundxtream.web.rest.util.PaginationUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.method.P;
import org.springframework.social.google.api.plus.Activity;
import org.springframework.web.bind.annotation.*;

import javax.imageio.ImageIO;
import javax.inject.Inject;
import javax.swing.*;
import javax.swing.filechooser.FileNameExtensionFilter;
import javax.validation.Valid;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.ImageObserver;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import static org.elasticsearch.index.query.QueryBuilders.queryStringQuery;

/**
 * REST controller for managing Playlist.
 */
@RestController
@RequestMapping("/api")
public class PlaylistResource {

    private final Logger log = LoggerFactory.getLogger(PlaylistResource.class);

    @Inject
    private PlaylistRepository playlistRepository;

    @Inject
    private PlaylistSearchRepository playlistSearchRepository;

    @Inject
    private UserRepository userRepository;

    @Inject
    private SeguimientoRepository seguimientoRepository;

    @Inject
    private Playlist_userRepository playlist_userRepository;

    @Inject
    private DateDiffService dateDiffService;

    @Inject
    private Song_userRepository song_userRepository;

    @Inject
    private SongRepository songRepository;

    /**
     * POST  /playlists -> Create a new playlist.
     */
    @RequestMapping(value = "/playlists",
        method = RequestMethod.POST,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<Playlist> createPlaylist(@Valid @RequestBody Playlist playlist) throws URISyntaxException {
        log.debug("REST request to save Playlist : {}", playlist);
        if (playlist.getId() != null) {
            return ResponseEntity.badRequest().headers(HeaderUtil.createFailureAlert("playlist", "idexists", "A new playlist cannot already have an ID")).body(null);
        }
        User user = userRepository.findOneByLogin(SecurityUtils.getCurrentUserLogin()).get();
        playlist.setUser(user);
        ZonedDateTime today = ZonedDateTime.now();
        if(playlist.getArtwork() == null){
            playlist.setArtwork(user.getUser_image());
        }
        playlist.setDateCreated(today);
        Playlist result = playlistRepository.save(playlist);
        playlistSearchRepository.save(result);
        return ResponseEntity.created(new URI("/api/playlists/" + result.getId()))
            .headers(HeaderUtil.createEntityCreationAlert("playlist", result.getId().toString()))
            .body(result);
    }

    /**
     * PUT  /playlists -> Updates an existing playlist.
     */
    @RequestMapping(value = "/playlists",
        method = RequestMethod.PUT,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<Playlist> updatePlaylist(@Valid @RequestBody Playlist playlist) throws URISyntaxException {
        log.debug("REST request to update Playlist : {}", playlist);
        if (playlist.getId() == null) {
            return createPlaylist(playlist);
        }
        User user = userRepository.findOneByLogin(SecurityUtils.getCurrentUserLogin()).get();
        playlist.setUser(user);
        ZonedDateTime today = ZonedDateTime.now();
        playlist.setDateCreated(today);

        List<Song> songsList = new ArrayList<>(playlist.getSongs());

        double new_duration = 0;

        for(Song song:songsList){
            new_duration += song.getDuration();
        }

        playlist.setFull_duration(new_duration);

        if(songsList.size() >= 4){

            List<Image> images = new ArrayList<>();

            BufferedImage bImage = new BufferedImage(500, 500,
                BufferedImage.TYPE_INT_RGB);

            try{
                for(Song song1:songsList){
                    File sourceimage = new File("./src/main/webapp/"+ song1.getArtwork());
                    images.add(ImageIO.read(sourceimage));
                }
            }catch (Exception e){

            }

            Canvas cnvs = new Canvas();
            cnvs.setSize(500,500);

            Graphics2D graphics = bImage.createGraphics();

            int i = 0;
            for(Image image:images){
                int x = 0,
                    y = 0;

                if(i == 1){
                    x = (cnvs.getWidth()/ 2);
                    y= 0;
                }
                if(i == 2){
                    x = 0;
                    y = (cnvs.getHeight() / 2 );
                }
                if(i == 3){
                    x = (cnvs.getWidth()/ 2);
                    y = (cnvs.getHeight() / 2 );
                }

                graphics.drawImage(image,x,y,(cnvs.getWidth() / 2),(cnvs.getHeight() / 2), cnvs);
                i++;
            }

            graphics.dispose();

            String playlistName =playlist.getName().replaceAll(":", "-");
            playlistName = playlistName.replaceAll(" ", "-");

            try{

                if (ImageIO.write(bImage, "png", new File("./src/main/webapp/uploads/"+playlistName+"-"+playlist.getId()+".jpg"))){
                    System.out.println("-- saved");
                }
            }catch (IOException e){
                e.printStackTrace();
            }

            playlist.setArtwork("uploads/"+playlistName+"-"+playlist.getId()+".jpg");

        }else{
            if(songsList.size() >= 1){
                playlist.setArtwork(songsList.get(0).getArtwork());
            }
            else{
                playlist.setArtwork(user.getUser_image());
            }
        }

        Playlist result = playlistRepository.save(playlist);
        playlistSearchRepository.save(result);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert("playlist", playlist.getId().toString()))
            .body(result);
    }

    /**
     * GET  /playlists -> get all the playlists.
     */
    @RequestMapping(value = "/playlists",
        method = RequestMethod.GET,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<List<PlaylistDTO>> getAllPlaylists(Pageable pageable)
        throws URISyntaxException {
        log.debug("REST request to get a page of Playlists");
        Page<Playlist> page = playlistRepository.findByUserIsCurrentUser(pageable);

        List<PlaylistDTO> listPlaylistDTO = new ArrayList<>();
        User user = userRepository.findOneByLogin(SecurityUtils.getCurrentUserLogin()).get();
        ZonedDateTime now = ZonedDateTime.now();

        for(Playlist playlist:page.getContent()){

            Playlist_user playlist_user = playlist_userRepository.findExistUserLiked(playlist.getId(),user.getLogin());
            PlaylistDTO playlistDTO = new PlaylistDTO();

            playlistDTO.setPlaylist(playlist);

            if(playlist_user == null || playlist_user.getLiked() == null || !playlist_user.getLiked()){
                playlistDTO.setLiked(false);
            }
            else{
                playlistDTO.setLiked(true);
            }

            if(playlist_user == null || playlist_user.getShared() == null || !playlist_user.getShared()){
                playlistDTO.setShared(false);
            }
            else{
                playlistDTO.setShared(true);
            }

            int countLikes = playlist_userRepository.findTotalLikes(playlist.getId());
            int countShares = playlist_userRepository.findTotalShares(playlist.getId());
            playlistDTO.setTotalLikes(countLikes);
            playlistDTO.setTotalShares(countShares);

            listPlaylistDTO.add(playlistDTO);

        }

        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(page, "/api/playlists");
        return new ResponseEntity<>(listPlaylistDTO, headers, HttpStatus.OK);
    }

    /**
     * GET  /playlists/:id -> get the "id" playlist.
     */
    @RequestMapping(value = "/playlists/{id}",
        method = RequestMethod.GET,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<PlaylistDTO> getPlaylist(@PathVariable Long id) {
        log.debug("REST request to get Playlist : {}", id);
        Playlist playlist = playlistRepository.findOneWithEagerRelationships(id);

        if (playlist == null) {
            return new ResponseEntity<>(null, null, HttpStatus.NOT_FOUND);
        }

        User user = userRepository.findOneByLogin(SecurityUtils.getCurrentUserLogin()).get();

        Playlist_user playlist_user = playlist_userRepository.findExistUserLiked(playlist.getId(),user.getLogin());
        PlaylistDTO playlistDTO = new PlaylistDTO();

        playlistDTO.setPlaylist(playlist);

        if(playlist_user == null || playlist_user.getLiked() == null || !playlist_user.getLiked()){
            playlistDTO.setLiked(false);
        }
        else{
            playlistDTO.setLiked(true);
        }

        if(playlist_user == null || playlist_user.getShared() == null || !playlist_user.getShared()){
            playlistDTO.setShared(false);
        }
        else{
            playlistDTO.setShared(true);
        }

        List<Playlist_user> playlist_userLikes = playlist_userRepository.findUsersLiked(playlist.getId());
        List<Playlist_user> playlist_userShares = playlist_userRepository.findUsersShared(playlist.getId());

        Set<User> usersLiked = new HashSet<>();
        Set<User> usersShared = new HashSet<>();

        for(Playlist_user playlist_user2:playlist_userLikes){
            usersLiked.add(playlist_user2.getUser());
        }

        for(Playlist_user playlist_user3:playlist_userShares){
            usersShared.add(playlist_user3.getUser());
        }

        playlistDTO.setUsersLiked(usersLiked);
        playlistDTO.setUsersShared(usersShared);

        int countLikes = playlist_userRepository.findTotalLikes(playlist.getId());
        int countShares = playlist_userRepository.findTotalShares(playlist.getId());
        playlistDTO.setTotalLikes(countLikes);
        playlistDTO.setTotalShares(countShares);

        return Optional.ofNullable(playlistDTO)
            .map(result -> new ResponseEntity<>(
                result,
                HttpStatus.OK))
            .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /**
     * DELETE  /playlists/:id -> delete the "id" playlist.
     */
    @RequestMapping(value = "/playlists/{id}",
        method = RequestMethod.DELETE,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<Void> deletePlaylist(@PathVariable Long id) {
        log.debug("REST request to delete Playlist : {}", id);
        playlistRepository.delete(id);
        playlistSearchRepository.delete(id);
        return ResponseEntity.ok().headers(HeaderUtil.createEntityDeletionAlert("playlist", id.toString())).build();
    }

    /**
     * SEARCH  /_search/playlists/:query -> search for the playlist corresponding
     * to the query.
     */
    @RequestMapping(value = "/_search/playlists/{query:.+}",
        method = RequestMethod.GET,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public List<Playlist> searchPlaylists(@PathVariable String query) {
        log.debug("REST request to search Playlists for query {}", query);
        return StreamSupport
            .stream(playlistSearchRepository.search(queryStringQuery(query)).spliterator(), false)
            .collect(Collectors.toList());
    }

    @RequestMapping(value = "/song/{id}/playlists",
        method = RequestMethod.GET,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<List<Playlist>> getPlaylistWithSong(@PathVariable Long id) {
        log.debug("REST request to get Playlist : {}", id);
        List<Playlist> playlists = playlistRepository.findAllWithEagerRelationships();
        List<Playlist> playlistWithSong = new ArrayList<>();

        for(Playlist playlist:playlists){
            for(Song song:playlist.getSongs()){
                if(song.getId() == id){
                    playlistWithSong.add(playlist);
                }
            }
        }

        return new ResponseEntity<>(
            playlistWithSong,
            HttpStatus.OK);
    }

    @RequestMapping(value = "/playlistsApp",
        method = RequestMethod.GET,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<List<Playlist>> getPlaylistsApp(Pageable pageable)
        throws URISyntaxException {
        log.debug("REST request to get a page of Songs");
        Page<Playlist> page = playlistRepository.findAll(pageable);

        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(page, "/api/songs");
        return new ResponseEntity<>(page.getContent(), headers, HttpStatus.OK);
    }

    @RequestMapping(value = "/activityFollowing",
        method = RequestMethod.GET,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<List<ActivityUser>> getAllActivityFollowing(Pageable pageable) throws URISyntaxException {

        User user = userRepository.findOneByLogin(SecurityUtils.getCurrentUserLogin()).get();

        Page<Object[]> page = seguimientoRepository.findAllActFollowing(user.getLogin(),pageable);
        List<Song> songs = seguimientoRepository.findActFollowingS(user.getLogin(),pageable);
        List<Playlist> playlists = seguimientoRepository.findActFollowingP(user.getLogin(), pageable);

        List<Song_user> sharesUser = seguimientoRepository.findActFollowingShares(user.getLogin(),pageable);
        List<Playlist_user> sharesP = seguimientoRepository.findActFollowingPlaylistShares(user.getLogin(), pageable);


        List<ActivityUser> not = new ArrayList<>();
        List<ActivityDTO> activity = new ArrayList<>();


        ZonedDateTime now = ZonedDateTime.now();


        for(Song song:songs){
            Song_user song_user = song_userRepository.findExistUserLiked(song.getId(),user.getLogin());
            SongDTO songDTO = new SongDTO();

            songDTO.setTimeAfterUpload(dateDiffService.diffDatesMap(now, song.getDate_posted()));

            songDTO.setSong(song);


            if(song_user == null || song_user.getLiked() == null || !song_user.getLiked()){
                songDTO.setLiked(false);
            }
            else{
                songDTO.setLiked(true);
            }


            if(song_user == null || song_user.getShared() == null || !song_user.getShared()){
                songDTO.setShared(false);
            }
            else{
                songDTO.setShared(true);
            }


            int countLikes = song_userRepository.findTotalLikes(song.getId());
            int countShares = song_userRepository.findTotalShares(song.getId());
            songDTO.setTotalLikes(countLikes);
            songDTO.setTotalShares(countShares);


            ActivityDTO actNew = new ActivityDTO();
            actNew.setSong(songDTO);
            actNew.setDate(song.getDate_posted());
            actNew.setType("upload_track");
            activity.add(actNew);
        }


        for(Playlist playlist:playlists){
            ActivityDTO actNew = new ActivityDTO();
            actNew.setPlaylist(playlist);
            actNew.setDate(playlist.getDateCreated());
            actNew.setType("created_playlist");
            activity.add(actNew);
        }


        for(Song_user song_user: sharesUser){
            Song_user song_user2 = song_userRepository.findExistUserLiked(song_user.getSong().getId(),user.getLogin());
            SongDTO songDTO = new SongDTO();


            songDTO.setTimeAfterUpload(dateDiffService.diffDatesMap(now, song_user.getSong().getDate_posted()));


            songDTO.setSong(song_user.getSong());


            if(song_user == null || song_user.getLiked() == null || !song_user.getLiked()){
                songDTO.setLiked(false);
            }
            else{
                songDTO.setLiked(true);
            }


            if(song_user == null || song_user.getShared() == null || !song_user.getShared()){
                songDTO.setShared(false);
            }
            else{
                songDTO.setShared(true);
            }


            int countLikes = song_userRepository.findTotalLikes(song_user.getSong().getId());
            int countShares = song_userRepository.findTotalShares(song_user.getSong().getId());
            songDTO.setTotalLikes(countLikes);
            songDTO.setTotalShares(countShares);


            ActivityDTO actNew = new ActivityDTO();
            actNew.setSong(songDTO);
            actNew.setDate(song_user.getSharedDate());
            actNew.setType("shared_track");
            actNew.setShareTrack(song_user);
            activity.add(actNew);
        }


        for(Playlist_user playlist_user: sharesP){
            ActivityDTO actNew = new ActivityDTO();
            actNew.setPlaylist(playlist_user.getPlaylist());
            actNew.setDate(playlist_user.getSharedDate());
            actNew.setType("shared_playlist");
            activity.add(actNew);
        }


        not.addAll(activity);
        not.sort(Comparator.comparing(ActivityUser::dateAction).reversed());


        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(page, "/api/songs");
        return new ResponseEntity<>(not, headers,HttpStatus.OK);

    }

    @RequestMapping(value = "/playlistUser/{login}",
        method = RequestMethod.GET,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<List<PlaylistDTO>> getPlaylistsUser(@PathVariable String login, Pageable pageable) throws URISyntaxException {

        Page<Playlist> page = playlistRepository.findPlaylistsUser(login,pageable);

        List<PlaylistDTO> listPlaylistDTO = new ArrayList<>();
        User user = userRepository.findOneByLogin(SecurityUtils.getCurrentUserLogin()).get();
        ZonedDateTime now = ZonedDateTime.now();

        for(Playlist playlist:page.getContent()){

            Playlist_user playlist_user = playlist_userRepository.findExistUserLiked(playlist.getId(),user.getLogin());
            PlaylistDTO playlistDTO = new PlaylistDTO();

            playlistDTO.setPlaylist(playlist);

            if(playlist_user == null || playlist_user.getLiked() == null || !playlist_user.getLiked()){
                playlistDTO.setLiked(false);
            }
            else{
                playlistDTO.setLiked(true);
            }

            if(playlist_user == null || playlist_user.getShared() == null || !playlist_user.getShared()){
                playlistDTO.setShared(false);
            }
            else{
                playlistDTO.setShared(true);
            }

            int countLikes = playlist_userRepository.findTotalLikes(playlist.getId());
            int countShares = playlist_userRepository.findTotalShares(playlist.getId());
            playlistDTO.setTotalLikes(countLikes);
            playlistDTO.setTotalShares(countShares);

            listPlaylistDTO.add(playlistDTO);

        }

        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(page, "/api/playlistUser");
        return new ResponseEntity<>(listPlaylistDTO, headers, HttpStatus.OK);
    }

    @RequestMapping(value = "/playlistUserLogged",
        method = RequestMethod.GET,
        produces = MediaType.APPLICATION_JSON_VALUE)
    @Timed
    public ResponseEntity<List<Playlist>> getPlaylistsUserLogged(Pageable pageable) throws URISyntaxException {

        User user = userRepository.findOneByLogin(SecurityUtils.getCurrentUserLogin()).get();

        Page<Playlist> page = playlistRepository.findPlaylistsUser(user.getLogin(),pageable);

        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(page, "/api/playlistUser");
        return new ResponseEntity<>(page.getContent(), headers, HttpStatus.OK);
    }

}

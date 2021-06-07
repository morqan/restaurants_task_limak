import React, { useState, useEffect, useRef } from 'react'
import { Alert, Linking, PermissionsAndroid, Platform, ToastAndroid, View, StyleSheet, Animated, Image, Dimensions } from 'react-native'
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import Geolocation from 'react-native-geolocation-service'
import axios from "axios";

const { width, height } = Dimensions.get("window");
const CARD_HEIGHT = 220;
const CARD_WIDTH = width * 0.8;
const SPACING_FOR_CARD_INSET = width * 0.1 - 10;
const MapScreen = () => {
    const mapRef = useRef(null)
    const [region, setRegion] = useState({
        latitude: 40.4093,
        longitude: 49.8671,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
    })
    const [restaurants, setRestaurants] = useState([])
    const [loading, setLoading] = useState(true)
    let mapAnimation = new Animated.Value(0);
    const hasLocationPermissionIOS = async () => {
        const openSetting = () => {
            Linking.openSettings().catch(() => { Alert.alert('Unable to open settings') })
        }
        const status = await Geolocation.requestAuthorization('whenInUse')

        if (status === 'granted') { return true }

        if (status === 'denied') { Alert.alert('Location permission denied') }

        if (status === 'disabled') {
            Alert.alert(
                `Turn on Location Services to allow "A Service" to determine your location.`,
                '',
                [
                    { text: 'Go to Settings', onPress: openSetting },
                    { text: "Don't Use Location", onPress: () => {} }
                ]
            )
        }
        return false
    }

    const hasLocationPermission = async () => {
        if (Platform.OS === 'ios') {
            const hasPermission = await hasLocationPermissionIOS()
            return hasPermission
        }
        if (Platform.OS === 'android' && Platform.Version < 23) { return true }
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        if (hasPermission) { return true }
        const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        if (status === PermissionsAndroid.RESULTS.GRANTED) { return true }
        if (status === PermissionsAndroid.RESULTS.DENIED) {
            ToastAndroid.show('Location permission denied by user.', ToastAndroid.LONG)
        } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            ToastAndroid.show('Location permission revoked by user.', ToastAndroid.LONG)
        }
        return false
    }
    const getGeoInfo = async () => {
        const hasPermission = await hasLocationPermission()
        if (!hasPermission) { return }
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                position => { resolve(position.coords) },
                error => reject(error),
                { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 }
            )
        })
    }
    const interpolations = restaurants.map((marker, index) => {
        // console.log(marker.geometry.location)
        const inputRange = [
            (index - 1) * CARD_WIDTH,
            index * CARD_WIDTH,
            ((index + 1) * CARD_WIDTH),
        ];

        const scale = mapAnimation.interpolate({
            inputRange,
            outputRange: [1, 1.5, 1],
            extrapolate: "clamp"
        });

        return { scale };
    });
    const onMarkerPress = (mapEventData) => {
        const markerID = mapEventData._targetInst.return.key;

        let x = (markerID * CARD_WIDTH) + (markerID * 20);
        if (Platform.OS === 'ios') {
            x = x - SPACING_FOR_CARD_INSET;
        }

        // _scrollView.current.scrollTo({x: x, y: 0, animated: true});
    }
    useEffect(() => {
        async function fetchGeoInfo () {
            let response = await getGeoInfo()
            const {latitude, longitude} = response
            setRegion({ ...region, latitude, longitude })
            let newCoordinate = { latitude, longitude }
            if (mapRef.current) {
                mapRef.current.animateCamera({center: newCoordinate, pitch: 2, heading: 20, altitude: 200, zoom: 11}, 1500)
            }
            const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?' + 'location=' + latitude + ',' + longitude + '&radius=3000&type=restaurant&key=AIzaSyAE-XLvU5nLW3VvlQdHjvMduOc8K9B2xn4';
            const restaurantsList = await axios.get(url)

            setRestaurants(restaurantsList.data.results)
            setLoading(false)
            console.log(restaurantsList.data.results)
        }

        fetchGeoInfo().then()
    }, [])
    if (loading) return null
    return (
        <View style={styles.container}>
            <MapView style={styles.container}
                     ref={mapRef}
                     // region={region}
                     initialCamera={{
                         center: { latitude: region.latitude, longitude: region.longitude },
                         pitch: 0,
                         zoom: 13,
                         heading: 0,
                         altitude: 0
                     }}
                // onRegionChangeComplete={region => setRegion(region)}
                     provider={PROVIDER_GOOGLE}
                     showsUserLocation
                     followsUserLocation
                     showsMyLocationButton={false} >
                {restaurants && restaurants.map((marker, index) => {
                    const latitude = marker.geometry.location.lat
                    const longitude = marker.geometry.location.lng
                    const coordinate = {latitude: latitude, longitude: longitude}
                    const scaleStyle = {
                        transform: [
                            {
                                scale: interpolations[index].scale,
                            },
                        ],
                    };
                    return (
                        <MapView.Marker key={index} coordinate={coordinate} onPress={(e)=>onMarkerPress(e)}>
                            <Animated.View style={[styles.markerWrap]}>
                                <Animated.Image
                                    source={require('../assets/map_marker.png')}
                                    style={[styles.marker, scaleStyle]}
                                    resizeMode="cover" />
                            </Animated.View>
                        </MapView.Marker>
                    );
                })}
            </MapView>
        </View>
    );
};

export default MapScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    markerWrap: {
        alignItems: "center",
        justifyContent: "center",
        width:50,
        height:50,
    },
    marker: {
        width: 30,
        height: 30,
    },
});

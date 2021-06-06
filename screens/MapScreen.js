import React, { useState, useEffect, useRef } from 'react'
import { Alert, Linking, PermissionsAndroid, Platform, ToastAndroid, View, StyleSheet } from 'react-native'
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import Geolocation from 'react-native-geolocation-service'
import axios from "axios";

const MapScreen = () => {
    const mapRef = useRef(null)
    const [region, setRegion] = useState({
        latitude: 40.4093,
        longitude: 49.8671,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
    })
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
    useEffect(() => {
        async function fetchGeoInfo () {
            let response = await getGeoInfo()
            const {latitude, longitude} = response
            // let newCoordinate = { latitude, longitude }
            // if (mapRef.current) {
            //     mapRef.current.animateCamera({center: newCoordinate, pitch: 2, heading: 20, altitude: 200, zoom: 17}, 1500)
            // }
            const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?' + 'location=' + latitude + ',' + longitude + '&radius=3000&type=restaurant&key=AIzaSyCMfIpRhn8QaGkYQ0I5KPWvFT1kLbA-DAM';
            const restaurantsList = await axios.get(url)
            console.log(restaurantsList.data.results)
            setRegion({ ...region, latitude, longitude })
        }

        fetchGeoInfo().then()
    }, [])
    return (
        <View style={styles.container}>
            <MapView style={styles.container}
                     ref={mapRef}
                     region={region}
                // onRegionChangeComplete={region => setRegion(region)}
                     provider={PROVIDER_GOOGLE}
                     showsUserLocation
                     followsUserLocation
                     showsMyLocationButton={false}
            />
        </View>
    );
};

export default MapScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,

    },
});

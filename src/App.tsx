import React from 'react';
import logo from './logo.svg';
import './App.css';
import "@aws-amplify/ui-react/styles.css";
import {
  withAuthenticator,
  Button,
  Heading,
  Image,
  View,
  Card,
} from "@aws-amplify/ui-react";

// Define the props for the App component
interface AppProps {
  signOut?: () => void;

}

function App({ signOut }: AppProps) {
  return (
    <View className='App'>
      <Card>
        <Image src={logo} className="App-logo" alt="logo" />
        <Heading level={1}>Welcome to Your Amplify App. We now have Auth!</Heading>
      </Card>
      <Button onClick={signOut}>Sign Out</Button>
    </View>
  )
}
export default withAuthenticator(App);

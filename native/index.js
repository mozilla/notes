import React from 'react';
import { AppRegistry, View, Text, Button } from 'react-native';
import { StackNavigator } from 'react-navigation';


function onPressLearnMore () {
  console.log('Wow debugk')
}

class DetailsScreen extends React.Component {
  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Details Screen</Text>
        <Button
          onPress={onPressLearnMore}
          title="Sync your Notes"
          color="#841584"
          accessibilityLabel="Sync your Notes using your Firefox Account"
        />
      </View>
    );
  }
}

const Notes = StackNavigator(
  {
    Home: {
      screen: DetailsScreen,
    },
    Details: {
      screen: DetailsScreen,
    },
  },
  {
    initialRouteName: 'Home',
  }
);
//
// import App from './src/App';
//
// import SecondScreen from './src/SecondScreen';
//
// const reactNavigationSample = props => {
//   return <App navigation={props.navigation} />;
// };
//
// const NotesApp = StackNavigator({
//   Home: { screen: reactNavigationSample },
//   SecondScreen: { screen: SecondScreen, title: 'Second Screen' }
// });

AppRegistry.registerComponent('Notes', () => Notes);
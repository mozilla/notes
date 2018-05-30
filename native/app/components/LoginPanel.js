import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { Button } from 'react-native-paper';
import { NavigationActions, StackActions } from 'react-navigation';
import { View, Text, ProgressBarAndroid, ToastAndroid, Image, StyleSheet } from 'react-native';

 import { COLOR_NOTES_BLUE } from '../utils/constants';
 import i18nGetMessage from '../utils/i18n';

class LoginPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: false
    };
  }

  onAuth () {
    this.setState({ isLoading: true });
    this.props.navigation.navigate('LoadingPanel');
  }

  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 30 }}>
          <Image
            style={{width: 150, height: 150 }}
            source={require('../assets/notes-1024.png')}
          />
          <Text style={{ fontWeight: 'bold', fontSize: 18, padding: 10 }}>
            { i18nGetMessage('welcomeTitle3') }
          </Text>
          <Text style={{ fontSize: 16, padding: 10 }}>Access your Test Pilot Notes</Text>
          <Button loading={this.state.isLoading} raised onPress={this.onAuth.bind(this)} color={COLOR_NOTES_BLUE}
            style={styles.btnSignin}>SIGN IN</Button>
        </View>
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

LoginPanel.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};


const styles = StyleSheet.create({
  btnSignin: {
    borderRadius: 25,
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 5,
    paddingBottom: 5
  },
});

export default connect(mapStateToProps)(LoginPanel)

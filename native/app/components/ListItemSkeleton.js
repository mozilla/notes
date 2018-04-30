import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated
} from 'react-native'

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { COLOR_NOTES_BLUE, COLOR_EMPTY } from '../utils/constants';

function randomSize(min, max) {
    return Math.random() * (max - min) + min;
}

class ListItemSkeleton extends React.Component {

  constructor (props) {
    super(props);

    this.size1 = randomSize(140, 180);
    this.size2 = randomSize(90, 150);
    this.size3 = randomSize(50, 70);

    this.interpolation = {
      inputRange: [0, 1],
      outputRange: [.4, 1]
    };

    this._startAnimation = () => {
      this.state.loadingAnimation.setValue(0);
      Animated.timing(this.state.loadingAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }).start(() => {
          Animated.timing(this.state.loadingAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true
          }).start(() => {
            setTimeout(() => this._startAnimation(), 1000);
          });
      });
    };

    this.state = {
      loadingAnimation: new Animated.Value(0)
    };

  }

  componentDidMount() {
    setTimeout(() => this._startAnimation(), this.props.index * 100);
  }

  render() {
    const {
      note
    } = this.props;

    return (
      <View style={styles.wrapper} >
        <Text style={ styles.selector } >
          <MaterialIcons
            name="remove"
            style={{ color: this.props.note ? COLOR_NOTES_BLUE : COLOR_EMPTY }}
            size={22}
          />
        </Text>
        <View style={ styles.content }>
          <Animated.View style={[styles.skeleton, { width: this.size1, opacity: this.state.loadingAnimation.interpolate(this.interpolation), marginBottom: 5 }]}></Animated.View>
          <Animated.View style={[styles.skeleton, { width: this.size2, opacity: this.state.loadingAnimation.interpolate(this.interpolation) }]}></Animated.View>
        </View>
        <Animated.View style={[styles.skeleton, { width: this.size3, opacity: this.state.loadingAnimation.interpolate(this.interpolation) }]}></Animated.View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 0,
    paddingRight: 10,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selector: {
    flexShrink: 0,
    paddingLeft: 18,
    paddingRight: 18
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 4,
    paddingRight: 10
  },
  skeleton: {
    backgroundColor: COLOR_EMPTY,
    opacity: .5,
    borderRadius: 4,
    height: 14
  }
});

export default ListItemSkeleton;

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';

const Navigation = ({ navigation, active }) => {
  const { unreadCount } = useNotifications(); // ✅ get global count

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Home')}
        style={[
          styles.navButton,
          active === 'Home' && styles.activeNavButton
        ]}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconContainer,
          active === 'Home' && styles.activeIconContainer
        ]}>
          <Text style={[
            styles.navIcon,
            active === 'Home' && styles.activeNavIcon
          ]}>🏠</Text>
        </View>
        <Text style={[
          styles.navLabel,
          active === 'Home' && styles.activeNavLabel
        ]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Notifications')}
        style={[
          styles.navButton,
          active === 'Notifications' && styles.activeNavButton
        ]}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconContainer,
          active === 'Notifications' && styles.activeIconContainer
        ]}>
          <Text style={[
            styles.navIcon,
            active === 'Notifications' && styles.activeNavIcon
          ]}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={[
          styles.navLabel,
          active === 'Notifications' && styles.activeNavLabel
        ]}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('UmrahPackages')}
        style={[
          styles.navButton,
          active === 'UmrahPackages' && styles.activeNavButton
        ]}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconContainer,
          active === 'UmrahPackages' && styles.activeIconContainer
        ]}>
          <Text style={[
            styles.navIcon,
            active === 'UmrahPackages' && styles.activeNavIcon
          ]}>🔍</Text>
        </View>
        <Text style={[
          styles.navLabel,
          active === 'UmrahPackages' && styles.activeNavLabel
        ]}>Explore</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Bookings')}
        style={[
          styles.navButton,
          active === 'Bookings' && styles.activeNavButton
        ]}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconContainer,
          active === 'Bookings' && styles.activeIconContainer
        ]}>
          <Text style={[
            styles.navIcon,
            active === 'Bookings' && styles.activeNavIcon
          ]}>📦</Text>
        </View>
        <Text style={[
          styles.navLabel,
          active === 'Bookings' && styles.activeNavLabel
        ]}>Bookings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Accounts')}
        style={[
          styles.navButton,
          active === 'Accounts' && styles.activeNavButton
        ]}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconContainer,
          active === 'Accounts' && styles.activeIconContainer
        ]}>
          <Text style={[
            styles.navIcon,
            active === 'Accounts' && styles.activeNavIcon
          ]}>👤</Text>
        </View>
        <Text style={[
          styles.navLabel,
          active === 'Accounts' && styles.activeNavLabel
        ]}>Account</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  navButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 60,
  },
  activeNavButton: {
    backgroundColor: 'rgba(187, 156, 102, 0.1)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  activeIconContainer: {
    backgroundColor: '#BB9C66',
    shadowColor: '#BB9C66',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  navIcon: {
    fontSize: 20,
    textAlign: 'center',
    color: '#666',
  },
  activeNavIcon: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  navLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  activeNavLabel: {
    color: '#BB9C66',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#d33',
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Navigation;

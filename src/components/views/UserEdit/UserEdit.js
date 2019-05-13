import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { cloneDeep, omit, differenceBy, get } from 'lodash';

import { eachPromise, getRecordObject } from '../../../util';

import UserForm from './UserForm';
import ViewLoading from '../ViewLoading';
import { toUserAddresses, toListAddresses } from '../../../converters/address';

function resourcesLoaded(obj) {
  for (const resource in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, resource)) {
      if (obj[resource] === null) {
        return false;
      }
      if (typeof obj[resource] === 'object') {
        if (Object.prototype.hasOwnProperty.call(obj[resource], 'isPending')) {
          if (obj[resource].isPending) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

class UserEdit extends React.Component {
  static propTypes = {
    stripes: PropTypes.object,
    resources: PropTypes.object,
  }

  getUser() {
    const { resources, match: { params: { id } } } = this.props;
    const selUser = (resources.selUser || {}).records || [];

    if (selUser.length === 0 || !id) return null;
    // Logging below shows this DOES sometimes find the wrong record. But why?
    // console.log(`getUser: found ${selUser.length} users, id '${selUser[0].id}' ${selUser[0].id === id ? '==' : '!='} '${id}'`);
    return selUser.find(u => u.id === id);
  }

  getUserFormValues() {
    const {
      getPreferredServicePoint,
      resources,
    } = this.props;
    const user = this.getUser();
    const userFormValues = cloneDeep(user);
    const formRecordValues = getRecordObject(
      resources,
      'sponsors',
      'proxies',
      'permissions',
      'servicePoints'
    );

    const addressTypes = resources.addressTypes.records;
    const addresses = toListAddresses(get(user, ['personal', 'addresses'], []), addressTypes);

    const preferredServicePoint = getPreferredServicePoint();
    userFormValues.personal.addresses = addresses;
    Object.assign(userFormValues, formRecordValues, {
      preferredServicePoint
    });

    return userFormValues;
  }

  getUserFormData() {
    const {
      resources
    } = this.props;
    const formData = getRecordObject(
      resources,
      'patronGroups',
      'addressTypes',
    );
    return formData;
  }

  update(user) {
    const addressTypes = (this.props.parentResources.addressTypes || {}).records || [];

    if (user.personal.addresses) {
      user.personal.addresses = toUserAddresses(user.personal.addresses, addressTypes); // eslint-disable-line no-param-reassign
    }

    const { proxies, sponsors, permissions, servicePoints, preferredServicePoint } = user;

    if (this.props.stripes.hasPerm('proxiesfor.item.put,proxiesfor.item.post')) {
      if (proxies) this.props.updateProxies(proxies);
      if (sponsors) this.props.updateSponsors(sponsors);
    }

    if (permissions) {
      this.updatePermissions(permissions);
    }

    if (servicePoints && this.props.stripes.hasPerm('inventory-storage.service-points-users.item.post,inventory-storage.service-points-users.item.put')) {
      this.props.updateServicePoints(servicePoints, preferredServicePoint);
    }

    const data = omit(user, ['creds', 'proxies', 'sponsors', 'permissions', 'servicePoints', 'preferredServicePoint']);
    const today = moment().endOf('day');

    data.active = (moment(user.expirationDate).endOf('day').isSameOrAfter(today));

    this.props.mutator.selUser.PUT(data).then(() => {
      this.setState({
        lastUpdate: new Date().toISOString(),
      });
      this.props.onCloseEdit();
    });
  }

  updatePermissions(perms) {
    const mutator = this.props.mutator.permissions;
    const prevPerms = (this.props.resources.permissions || {}).records || [];
    const removedPerms = differenceBy(prevPerms, perms, 'id');
    const addedPerms = differenceBy(perms, prevPerms, 'id');
    eachPromise(addedPerms, mutator.POST);
    eachPromise(removedPerms, mutator.DELETE);
  }

  render() {
    const {
      history,
      location,
      resources,
    } = this.props;

    if (!resourcesLoaded(resources)) {
      return <ViewLoading inPaneset paneTitle="Edit User" />;
    }

    // values are strictly values...
    const formValues = this.getUserFormValues();

    // data is information that the form needs, mostly to populate options lists
    const formData = this.getUserFormData();

    return (
      <UserForm
        formData={formData}
        initialValues={formValues}
        onSubmit={record => this.update(record)}
        onCancel={() => { history.push(location.state.launched); }}
      />
    );
  }
}

export default UserEdit;

import React from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import _ from 'lodash';
// eslint-disable-next-line import/no-extraneous-dependencies
import moment from 'moment';
import ChargeForm from './ChargeForm';
import ItemLookup from './ItemLookup';
import PayModal from '../Actions/PayModal';

class Charge extends React.Component {
  static manifest = Object.freeze({
    items: {
      type: 'okapi',
      records: 'items',
      path: 'inventory/items?query=barcode=%{activeRecord.barcode}*',
    },
    feefines: {
      type: 'okapi',
      records: 'feefines',
      GET: {
        path: 'feefines?query=(ownerId=%{activeRecord.ownerId} or ownerId=%{activeRecord.shared})&limit=100',
      },
    },
    feefineactions: {
      type: 'okapi',
      records: 'feefineactions',
      path: 'feefineactions',
    },
    owners: {
      type: 'okapi',
      records: 'owners',
      path: 'owners?limit=100',
    },
    accounts: {
      type: 'okapi',
      records: 'accounts',
      path: 'accounts',
      PUT: {
        path: 'accounts/%{activeRecord.id}'
      },
    },
    payments: {
      type: 'okapi',
      records: 'payments',
      path: 'payments',
    },
    activeRecord: {},
  });

  static propTypes = {
    resources: PropTypes.shape({
      feefines: PropTypes.shape({
        records: PropTypes.arrayOf(PropTypes.object),
      }),
      owners: PropTypes.shape({
        records: PropTypes.arrayOf(PropTypes.object),
      }),
      activeRecord: PropTypes.object,
    }).isRequired,
    mutator: PropTypes.shape({
      accounts: PropTypes.shape({
        POST: PropTypes.func.isRequired,
        PUT: PropTypes.func.isRequired,
      }),
      feefineactions: PropTypes.shape({
        POST: PropTypes.func.isRequired,
      }),
      activeRecord: PropTypes.shape({
        update: PropTypes.func,
      }),
    }).isRequired,
    stripes: PropTypes.object,
    onCloseChargeFeeFine: PropTypes.func.isRequired,
    handleAddRecords: PropTypes.func,
    okapi: PropTypes.object,
    selectedLoan: PropTypes.object,
    user: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {
      ownerId: '0',
      lookup: false,
      pay: false,
    };
    this.onClickCharge = this.onClickCharge.bind(this);
    this.onClickSelectItem = this.onClickSelectItem.bind(this);
    this.onChangeOwner = this.onChangeOwner.bind(this);
    this.onFindShared = this.onFindShared.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.item = {};
    this.onCloseModal = this.onCloseModal.bind(this);
    this.onChangeItem = this.onChangeItem.bind(this);
    this.onClosePayModal = this.onClosePayModal.bind(this);
    this.onClickPay = this.onClickPay.bind(this);
    this.type = {};
  }

  shouldComponentUpdate(nextProps) {
    const items = _.get(this.props.resources, ['items', 'records'], []);
    const nextItems = _.get(nextProps.resources, ['items', 'records'], []);
    const barcode = _.get(this.props.resources, ['activeRecord', 'barcode']);
    if (nextItems.length === 1 && barcode !== null) {
      if (nextItems[0].barcode === barcode) this.item = nextItems[0];
    }

    if (items !== nextItems) {
      this.setState({
        lookup: true,
      });
    }

    return true;
  }

  componentWillUnmount() {
    this.item = {};
    this.props.mutator.activeRecord.update({ barcode: null });
  }

  onClickCharge(type) {
    const owners = _.get(this.props.resources, ['owners', 'records'], []);
    const feefines = _.get(this.props.resources, ['feefines', 'records'], []);
    const { selectedLoan } = this.props;
    const item = (selectedLoan.id) ? selectedLoan.item : this.item;

    type.feeFineType = feefines.find(f => f.id === type.feeFineId).feeFineType || '';
    type.feeFineOwner = owners.find(o => o.id === type.ownerId).owner || '';
    type.title = item.title;
    type.barcode = item.barcode;
    type.callNumber = item.callNumber;
    type.location = (selectedLoan.id) ? (item.location || {}).name : (item.effectiveLocation || {}).name;
    type.materialType = (item.materialType || {}).name;
    type.materialTypeId = (selectedLoan.id) ? '0' : (item.materialType || {}).id || '0';

    if (selectedLoan.dueDate) type.dueDate = selectedLoan.dueDate;
    if (selectedLoan.returnDate) type.returnedDate = selectedLoan.returnDate;
    type.id = uuid();
    type.loanId = this.props.selectedLoan.id || '0';
    type.userId = this.props.user.id;
    type.itemId = this.item.id || '0';
    const c = type.comments;
    delete type.comments;
    return this.props.mutator.accounts.POST(type)
      .then(() => this.newAction({}, type.id, type.feeFineType, type.amount, c, type.remaining, 0, type.feeFineOwner));
  }

  newAction = (action, id, typeAction, amount, comment, balance, transaction, createAt) => {
    const newAction = {
      typeAction,
      source: `${this.props.okapi.currentUser.lastName}, ${this.props.okapi.currentUser.firstName}`,
      createdAt: createAt,
      accountId: id,
      dateAction: moment().utc().format(),
      userId: this.props.user.id,
      amountAction: parseFloat(amount || 0).toFixed(2),
      balance: parseFloat(balance || 0).toFixed(2),
      transactionNumber: transaction || 0,
      comments: comment || '',
    };
    return this.props.mutator.feefineactions.POST(Object.assign(action, newAction));
  }


  onClickPay(type) {
    this.setState({
      pay: true,
    });
    this.type = type;
  }

  onSubmit(data) {
    this.log('xhr', data);
  }

  onClosePayModal() {
    this.setState({
      pay: false,
    });
  }

  onClickSelectItem(barcode) {
    if (barcode !== '') {
      this.props.mutator.activeRecord.update({ barcode });
      if ((this.props.resources.activeRecord || {}).barcode === barcode) {
        this.setState({
          lookup: true,
        });
      }
    }
  }

  onChangeOwner(e) {
    const ownerId = e.target.value;
    if (_.get(this.props.resources, ['activeRecord', 'shared']) === undefined) {
      this.props.mutator.activeRecord.update({ shared: '0' });
    }
    this.props.mutator.activeRecord.update({ ownerId });
    this.setState({
      ownerId,
    });
  }

  onChangeItem(item) {
    this.item = item;
  }

  onFindShared(id) {
    this.props.mutator.activeRecord.update({ shared: id });
  }

  onCloseModal() {
    this.setState({
      lookup: false,
    });
  }

  render() {
    const resources = this.props.resources;
    const owners = _.get(resources, ['owners', 'records'], []);
    const feefines = (this.state.ownerId !== '0') ? (resources.feefines || {}).records || [] : [];
    const payments = _.get(resources, ['payments', 'records'], []);
    const accounts = _.get(resources, ['accounts', 'records'], []);
    let selected = parseFloat(0);
    accounts.forEach(a => {
      selected += parseFloat(a.remaining);
    });
    parseFloat(selected).toFixed(2);
    const item = {
      id: this.item.id || '',
      instance: this.item.title || '',
      barcode: this.item.barcode || '',
      itemStatus: (this.item.status || {}).name || '',
      callNumber: this.item.callNumber || '',
      location: (this.item.effectiveLocation || {}).name || '',
      type: (this.item.materialType || {}).name || '',
    };

    const isPending = {
      owners: _.get(resources, ['owners', 'isPending'], false),
      feefines: _.get(resources, ['feefines', 'isPending'], false),
    };

    const items = _.get(resources, ['items', 'records'], []);

    return (
      <div>
        <ChargeForm
          onClickCancel={this.props.onCloseChargeFeeFine}
          onClickCharge={this.onClickCharge}
          onClickPay={this.onClickPay}
          onSubmit={data => this.onSubmit(data)}
          user={this.props.user}
          owners={owners}
          isPending={isPending}
          ownerId={this.state.ownerId}
          feefines={feefines}
          item={item}
          onFindShared={this.onFindShared}
          onChangeOwner={this.onChangeOwner}
          onClickSelectItem={this.onClickSelectItem}
          stripes={this.props.stripes}
          {...this.props}
        />
        <ItemLookup
          resources={this.props.resources}
          items={items}
          open={(this.state.lookup && items.length > 1)}
          onChangeItem={this.onChangeItem}
          onClose={this.onCloseModal}
        />
        <PayModal
          open={this.state.pay}
          commentRequired
          onClose={this.onClosePayModal}
          accounts={[this.type]}
          balance={this.type.amount}
          payments={payments}
          onSubmit={(values) => {
            this.type.remaining = parseFloat(this.type.amount - values.amount).toFixed(2);
            if (this.type.remaining === '0.00') {
              this.type.paymentStatus.name = 'Paid Fully';
              this.type.status.name = 'Closed';
            } else {
              this.type.paymentStatus.name = 'Paid Partially';
            }
            this.props.mutator.activeRecord.update({ id: this.type.id });
            this.props.mutator.accounts.PUT(this.type)
              .then(() => this.newAction({}, this.type.id,
                this.type.paymentStatus.name, values.amount,
                values.comment, this.type.remaining,
                values.transaction, this.type.feeFineOwner))
              .then(() => this.props.handleAddRecords())
              .then(() => this.props.onCloseChargeFeeFine());
          }}
        />
      </div>
    );
  }
}

export default Charge;

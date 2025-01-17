// eslint-disable-next-line jsx-a11y/label-has-associated-control
import CQLParser from './cql';

// typical mirage config export
// http://www.ember-cli-mirage.com/docs/v0.4.x/configuration/
export default function config() {
  // okapi endpoints
  this.get('/_/version', () => '0.0.0');

  this.get('_/proxy/tenants/:id/modules', [
    {
      id: 'mod-circulation-16.0.0-SNAPSHOT.253',
      name: 'Circulation Module',
      provides: [
        { id: 'circulation', version: '7.4' },
        { id: 'loan-policy-storage', version: '7.4' }
      ]
    }
  ]);

  this.get('/saml/check', {
    ssoEnabled: false
  });

  this.get('/configurations/entries', {
    configs: []
  });
  this.post('/bl-users/login', () => {
    return new Response(201, {
      'X-Okapi-Token': `myOkapiToken:${Date.now()}`
    }, {
      user: {
        id: 'test',
        username: 'testuser',
        personal: {
          lastName: 'User',
          firstName: 'Test',
          email: 'user@folio.org',
        }
      },
      permissions: {
        permissions: []
      }
    });
  });
  this.get('/groups', {
    'usergroups': [{
      'group': 'alumni_1383',
      'desc': 'Alumni',
      'id': 'group1',
    }, {
      'group': 'alumni_2121',
      'desc': 'Alumni',
      'id': 'group2',
    }, {
      'group': 'alumni_6422',
      'desc': 'Alumni',
      'id': 'group3',
    }, {
      'group': 'faculty',
      'desc': 'Faculty Member',
      'id': 'group4',
    }, {
      'group': 'graduate',
      'desc': 'Graduate Student',
      'id': 'group5',
    }, {
      'group': 'staff',
      'desc': 'Staff Member',
      'id': 'group6',
    }, {
      'group': 'undergrad',
      'desc': 'Undergraduate Student',
      'id': 'group7',
    }],
    'totalRecords': 7
  });
  this.get('/addresstypes', {
    'addressTypes': [{
      'addressType': 'Claim',
      'desc': 'Claim Address',
      'id': 'Type1',
    }, {
      'addressType': 'Home',
      'desc': 'Home Address',
      'id': 'Type2',
    }, {
      'addressType': 'Order',
      'desc': 'Order Address',
      'id': 'Type3',
    }, {
      'addressType': 'Payment',
      'desc': 'Payment Address',
      'id': 'Type4',
    }, {
      'addressType': 'Returns',
      'desc': 'Returns Address',
      'id': 'Type5',
    }, {
      'addressType': 'Work',
      'desc': 'Work Address',
      'id': 'Type6',
    }],
    'totalRecords': 6
  });

  this.get('/users', ({ users }, request) => {
    if (request.queryParams.query) {
      const cqlParser = new CQLParser();
      const query = request.queryParams.query.split('sortby')[0];
      const filterField = 'active';

      cqlParser.parse(query);

      const {
        tree: {
          term,
          field,
        }
      } = cqlParser;

      if (field === filterField) {
        return users.where({
          [filterField]: term === 'true'
        });
      }
    }

    return users.all();
  });

  this.get('/users/:id', (schema, request) => {
    return schema.users.find(request.params.id).attrs;
  });

  this.put('/users/:id', (schema, request) => {
    return schema.users.find(request.params.id).attrs;
  });

  this.get('/proxiesfor', {
    proxiesFor: [],
    totalRecords: 0,
  });

  this.get('/service-points-users', ({ servicePointsUsers }, request) => {
    const url = new URL(request.url);
    const cqlQuery = url.searchParams.get('query');
    const cqlParser = new CQLParser();
    cqlParser.parse(cqlQuery);
    return servicePointsUsers.where({
      userId: cqlParser.tree.term
    });
  });

  this.get('/service-points-users/:id', ({ servicePointsUsers }, request) => {
    return servicePointsUsers.find(request.params.id).attrs;
  });

  this.put('/service-points-users/:id', ({ servicePointsUsers }, request) => {
    return servicePointsUsers.find(request.params.id).attrs;
  });

  this.get('/service-points');

  this.get('/circulation/loans', function ({ loans }) {
    return this.serializerOrRegistry.serialize(loans.all());
  });

  this.get('loan-storage/loan-history', {
    loansHistory: [],
    totalRecords: 0,
  });

  this.get('/circulation/requests', function ({ requests }) {
    return this.serializerOrRegistry.serialize(requests.all());
  });

  this.get('/loan-policy-storage/loan-policies', {
    'loanPolicies' : [{
      'id' : 'test',
      'name' : 'Example Loan Policy',
      'description' : 'An example loan policy',
      'loanable' : true,
      'loansPolicy' : {
        'profileId' : 'Rolling',
        'period' : {
          'duration' : 1,
          'intervalId' : 'Months'
        },
        'closedLibraryDueDateManagementId' : 'KEEP_CURRENT_DATE',
        'gracePeriod' : {
          'duration' : 7,
          'intervalId' : 'Days'
        }
      },
      'renewable' : true,
      'renewalsPolicy' : {
        'unlimited' : true,
        'renewFromId' : 'CURRENT_DUE_DATE',
        'differentPeriod' : true,
        'period' : {
          'duration' : 30,
          'intervalId' : 'Days'
        }
      }
    }],
    'totalRecords' : 1
  });

  this.get('accounts', {
    accounts: [],
    totalRecords: 0,
    resultInfo: {
      totalRecords: 0,
      facets: [],
      diagnostics: [],
    },
  });
  this.get('waives', {
    waiver: [],
    totalRecords: 0,
    resultInfo: {
      totalRecords: 0,
      facets: [],
      diagnostics: [],
    },
  });
  this.get('payments', {
    payments: [],
    totalRecords: 0,
    resultInfo: {
      totalRecords: 0,
      facets: [],
      diagnostics: [],
    },
  });
  this.get('comments', {
    comments: [],
    totalRecords: 0,
    resultInfo: {
      totalRecords: 0,
      facets: [],
      diagnostics: [],
    },
  });
  this.get('feefines', {
    feefines: [],
    totalRecords: 0,
    resultInfo: {
      totalRecords: 0,
      facets: [],
      diagnostics: [],
    },
  });
  this.get('/manualblocks', {
    manualblocks: [],
    totalRecords: 0,
  });
  this.get('/perms/users/:id/permissions', {
    permissionNames: [],
  });
  this.get('/perms/permissions', {
    permissions: [],
    totalRecords: 0,
  });
  this.get('/feefineactions', {
    feefineactions: [],
    totalRecords: 0,
  });
  this.get('/owners', {
    owners: [],
    totalRecords: 0,
  });

  this.get('/authn/credentials-existence', () => {});
}

define(function (require) {
  const app = require('ui/modules').get('app/visualize');
  const _ = require('lodash');
  const Scanner = require('ui/utils/scanner');

  require('plugins/kibana/visualize/saved_visualizations/_saved_vis');

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedVisualizations',
    title: 'visualizations'
  });

  app.service('savedVisualizations', function (Promise, es, savedObjectsAPI, kbnIndex, SavedVis, Private, createNotifier, kbnUrl) {
    const visTypes = Private(require('ui/registry/vis_types'));

    const scanner = new Scanner(es, {
      index: kbnIndex,
      type: 'visualization'
    });

    const notify = createNotifier({
      location: 'Saved Visualization Service'
    });

    this.type = SavedVis.type;
    this.Class = SavedVis;

    this.loaderProperties = {
      name: 'visualizations',
      noun: 'Visualization',
      nouns: 'visualizations'
    };

    this.get = function (id) {
      return (new SavedVis(id)).init();
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/visualize/edit/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedVis(id)).delete();
      });
    };

    this.scanAll = function (queryString, pageSize = 1000) {
      return scanner.scanAndMap(queryString, {
        pageSize,
        docCount: Infinity
      }, (hit) => this.mapHits(hit));
    };

    this.mapHits = function (hit) {
      const source = hit._source;
      source.id = hit._id;
      source.url = this.urlFor(hit._id);

      let typeName = source.typeName;
      if (source.visState) {
        try { typeName = JSON.parse(source.visState).type; }
        catch (e) { /* missing typename handled below */ } // eslint-disable-line no-empty
      }

      if (!typeName || !visTypes.byName[typeName]) {
        if (!typeName) notify.error('Visualization type is missing. Please add a type to this visualization.', hit);
        else notify.error('Visualization type of "' + typeName + '" is invalid. Please change to a valid type.', hit);
        return kbnUrl.redirect('/settings/objects/savedVisualizations/{{id}}', {id: source.id});
      }

      source.type = visTypes.byName[typeName];
      source.icon = source.type.icon;
      return source;
    };

    // kibi: get visualizations from the Saved Object API.
    this.find = function (searchString, size = 100) {
      if (!searchString) {
        searchString = null;
      }

      return savedObjectsAPI.search({
        index: kbnIndex,
        type: this.type,
        q: searchString,
        size: size
      })
      .then((resp) => {
        return {
          total: resp.hits.total,
          hits: resp.hits.hits.map((hit) => this.mapHits(hit))
        };
      });
    };
    // kibi: end
  });
});

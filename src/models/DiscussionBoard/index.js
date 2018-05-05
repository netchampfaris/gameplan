export default {
  name: 'DiscussionBoard',
  doctype: 'DocType',
  naming: 'random',
  isSingle: 0,
  isChild: 0,
  keywordFields: [
    'title',
  ],
  fields: [
    {
      fieldname: 'title',
      label: 'Title',
      fieldtype: 'Data',
      required: 1,
    },
  ],
};

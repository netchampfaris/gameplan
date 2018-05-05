export default {
  name: 'DiscussionBoardMessage',
  doctype: 'DocType',
  naming: 'random',
  isSingle: 0,
  isChild: 0,
  keywordFields: [
    'content',
  ],
  fields: [
    {
      fieldname: 'sender',
      label: 'Sender',
      fieldtype: 'Link',
      target: 'User',
      required: 1,
    },
    {
      fieldname: 'content',
      label: 'Content',
      fieldtype: 'Long Text',
      required: 1,
    },
  ],
};

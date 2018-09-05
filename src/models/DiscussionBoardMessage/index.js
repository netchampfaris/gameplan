module.exports = {
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
      fieldname: 'discussionBoard',
      label: 'Discussion Board',
      fieldtype: 'Link',
      target: 'DiscussionBoard',
      required: 1,
    },
    {
      fieldname: 'content',
      label: 'Content',
      fieldtype: 'Long Text',
      required: 1,
    }
  ],
};

export const CONFIGS = {
  artists: {
    title: 'Artist',
    fields: [
      { name: 'first_name', label: 'First Name *', type: 'text', required: true },
      { name: 'last_name', label: 'Last Name', type: 'text' },
      { name: 'phone_mobile', label: 'Mobile Phone', type: 'text' },
      { name: 'phone_other', label: 'Other Phone', type: 'text' },
      { name: 'email', label: 'Email Address', type: 'text' },
      { name: 'profile_image', label: 'Profile Image Filename', type: 'text', placeholder: 'e.g. profile_sadequain.jpg' },
      
      { name: 'primary_address_street', label: 'Address', type: 'text' },
      { name: 'primary_address_city', label: 'City', type: 'text' },
      { name: 'primary_address_country', label: 'Country', type: 'text' },
      
      { name: 'artist_advance', label: 'Artist Advance', type: 'number', defaultValue: 0.0 },
      { name: 'pending_amount', label: 'Pending Amount', type: 'number', defaultValue: 0.0 },
      { name: 'artist_biography', label: 'Artist Biography', type: 'textarea' }
    ],
    importFields: [
      'first_name', 'last_name', 'phone_mobile', 'phone_other', 'email', 'profile_image',
      'primary_address_street', 'primary_address_city', 'primary_address_country',
      'artist_advance', 'pending_amount', 'artist_biography'
    ]
  },
  collections: {
    title: 'Artwork',
    fields: [
      { name: 'title', label: 'Artwork Title *', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'status', label: 'Status *', type: 'select', options: ['Available', 'Sold', 'Reserved'], defaultValue: 'Available', required: true },
      { name: 'price', label: 'Retail Price (PKR)', type: 'number' },
      { name: 'length', label: 'Length (inches)', type: 'number' },
      { name: 'width', label: 'Width (inches)', type: 'number' },
      { name: 'with_frame', label: 'Framed? (0=No, 1=Yes)', type: 'select', options: [{value: '0', label: 'No'}, {value: '1', label: 'Yes'}], defaultValue: '0' },
      { name: 'frame_charges', label: 'Frame Charges (PKR)', type: 'number' },
      { name: 'code', label: 'Artwork Code / Serial', type: 'text' },
      { name: 'artist_id', label: 'Artist *', type: 'lookup', lookupType: 'artists', required: true },
      { name: 'category_id', label: 'Category / Collection Type *', type: 'lookup', lookupType: 'collection-types', required: true },
      { name: 'medium_id', label: 'Medium *', type: 'lookup', lookupType: 'mediums', required: true },
      { name: 'deal_type', label: 'Deal Type *', type: 'select', options: [{value: 'Sale_Basis', label: 'Sale Basis'}, {value: 'Purchase_Basis', label: 'Gallery Purchase'}], defaultValue: 'Sale_Basis', required: true },
      { name: 'purchase_price', label: 'Purchase Price (PKR)', type: 'number', placeholder: 'Purchase Price from Artist' },
      { name: 'image', label: 'Image Filename / ID', type: 'text', placeholder: 'e.g. DSC_0023.jpg or upload uuid' },
      { name: 'authenticity_letter', label: 'Authenticity Letter', type: 'text', defaultValue: 'auto' }
    ],
    importFields: ['title', 'description', 'status', 'price', 'length', 'width', 'with_frame', 'frame_charges', 'code', 'artist_id', 'category_id', 'medium_id', 'image', 'authenticity_letter', 'deal_type', 'purchase_price']
  },
  collection_types: {
    title: 'Collection Type',
    fields: [
      { name: 'name', label: 'Category/Type Name *', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' }
    ],
    importFields: ['name', 'description']
  },
  mediums: {
    title: 'Medium',
    fields: [
      { name: 'name', label: 'Medium Name *', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' }
    ],
    importFields: ['name', 'description']
  },
  customers: {
    title: 'Customer',
    fields: [
      { name: 'name', label: 'Full Name *', type: 'text', required: true },
      { name: 'email', label: 'Email Address', type: 'text' },
      { name: 'phone', label: 'Phone Number', type: 'text' },
      { name: 'address', label: 'Billing/Delivery Address', type: 'textarea' }
    ],
    importFields: ['name', 'email', 'phone', 'address']
  },
  payments: {
    title: 'Payment Record',
    fields: [
      { name: 'name', label: 'Invoice reference / Description *', type: 'text', required: true },
      { name: 'amount', label: 'Amount (PKR) *', type: 'number', required: true },
      { name: 'bank_name', label: 'Bank Name (if Cheque/Wire)', type: 'text' },
      { name: 'cheque_number', label: 'Cheque / Reference Number', type: 'text' },
      { name: 'sales_stage', label: 'Sales Stage *', type: 'select', options: ['Closed Won', 'Prospecting', 'Closed Lost'], defaultValue: 'Closed Won', required: true },
      { name: 'description', label: 'Internal Notes', type: 'textarea' }
    ],
    importFields: ['name', 'amount', 'bank_name', 'cheque_number', 'sales_stage', 'description']
  },
  exhibitions: {
    title: 'Exhibition',
    fields: [
      { name: 'document_name', label: 'Exhibition Title *', type: 'text', required: true },
      { name: 'filename', label: 'Cover Image Filename', type: 'text' },
      { name: 'active_date', label: 'Start Date (YYYY-MM-DD)', type: 'date' },
      { name: 'exp_date', label: 'End Date (YYYY-MM-DD)', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea' }
    ],
    importFields: ['document_name', 'filename', 'active_date', 'exp_date', 'description']
  },
  framerheaven: {
    title: 'Framer\'s Heaven Product/Service',
    fields: [
      { name: 'document_name', label: 'Service/Product Title *', type: 'text', required: true },
      { name: 'filename', label: 'Photo Filename', type: 'text' },
      { name: 'category_id', label: 'Category *', type: 'select', options: [{value: 'Product', label: 'Product'}, {value: 'Service', label: 'Service'}], defaultValue: 'Product', required: true },
      { name: 'is_featured_c', label: 'Featured Product/Service', type: 'checkbox', defaultValue: 0 },
      { name: 'description', label: 'Description', type: 'textarea' }
    ],
    importFields: ['document_name', 'filename', 'category_id', 'is_featured_c', 'description']
  },
  catalogues: {
    title: 'Catalogue',
    fields: [
      { name: 'document_name', label: 'Catalogue Title *', type: 'text', required: true },
      { name: 'filename', label: 'PDF Catalog Filename', type: 'text', placeholder: 'e.g. summer_catalog.pdf' },
      { name: 'description', label: 'Description', type: 'textarea' }
    ],
    importFields: ['document_name', 'filename', 'description']
  },
  flashimages: {
    title: 'Flash Image Banner',
    fields: [
      { name: 'document_name', label: 'Banner Name *', type: 'text', required: true },
      { name: 'filename', label: 'Banner Image Filename', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' }
    ],
    importFields: ['document_name', 'filename', 'description']
  },
  videos: {
    title: 'Gallery Video',
    fields: [
      { name: 'document_name', label: 'Video Title *', type: 'text', required: true },
      { name: 'filename', label: 'Video URL / Filename', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' }
    ],
    importFields: ['document_name', 'filename', 'description']
  }
};

export const LIST_COLUMNS = {
  artists: [
    { key: 'profile_image', label: 'Photo' },
    { key: 'name', label: 'Artist Name' },
    { key: 'title', label: 'Title/Designation' },
    { key: 'phone_mobile', label: 'Phone' },
    { key: 'primary_address_street', label: 'Address' },
    { key: 'portfolio_report', label: 'Portfolio' }
  ],
  collections: [
    { key: 'image', label: 'Photo' },
    { key: 'title', label: 'Artwork Title' },
    { key: 'code', label: 'Code' },
    { key: 'artist_name', label: 'Artist' },
    { key: 'category_name', label: 'Category' },
    { key: 'medium_name', label: 'Medium' },
    { key: 'price', label: 'Price (PKR)', format: (v) => v ? `${v.toLocaleString()} PKR` : 'Inquiry' },
    { key: 'deal_type', label: 'Deal Type', format: (v) => v === 'Purchase_Basis' ? 'Gallery Purchase' : 'Sale Basis' },
    { key: 'status', label: 'Status' },
    { key: 'authenticity_letter', label: 'Letter' }
  ],
  collection_types: [
    { key: 'name', label: 'Category Name' },
    { key: 'description', label: 'Description' }
  ],
  mediums: [
    { key: 'name', label: 'Medium Name' },
    { key: 'description', label: 'Description' }
  ],
  customers: [
    { key: 'name', label: 'Customer Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address' }
  ],
  payments: [
    { key: 'name', label: 'Transaction Description' },
    { key: 'amount', label: 'Amount (PKR)', format: (v) => v ? `${v.toLocaleString()} PKR` : '0' },
    { key: 'bank_name', label: 'Bank Name' },
    { key: 'cheque_number', label: 'Cheque #' },
    { key: 'sales_stage', label: 'Sales Stage' },
    { key: 'date_entered', label: 'Created' }
  ],
  invoices: [
    { key: 'name', label: 'Invoice Name' },
    { key: 'amount', label: 'Amount', format: (v) => v ? `${v.toLocaleString()} PKR` : '0' },
    { key: 'sales_stage', label: 'Sales Stage' },
    { key: 'date_entered', label: 'Created' }
  ],
  exhibitions: [
    { key: 'document_name', label: 'Title' },
    { key: 'active_date', label: 'Start Date' },
    { key: 'exp_date', label: 'End Date' },
    { key: 'description', label: 'Description' }
  ],
  framerheaven: [
    { key: 'filename', label: 'Photo' },
    { key: 'document_name', label: 'Product/Service' },
    { key: 'category_id', label: 'Category' },
    { key: 'is_featured_c', label: 'Featured', format: (v) => v ? '★ Yes' : 'No' },
    { key: 'description', label: 'Description' }
  ],
  catalogues: [
    { key: 'filename', label: 'Photo' },
    { key: 'document_name', label: 'Title' },
    { key: 'description', label: 'Description' }
  ],
  flashimages: [
    { key: 'document_name', label: 'Banner Name' },
    { key: 'filename', label: 'Banner Image' },
    { key: 'description', label: 'Description' }
  ],
  videos: [
    { key: 'document_name', label: 'Title' },
    { key: 'filename', label: 'File/URL' },
    { key: 'description', label: 'Description' }
  ]
};

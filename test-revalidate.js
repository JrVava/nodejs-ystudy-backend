const secret = 'af492cd1cba29151eb256b883724ed7f4b325c67bd6092fab25f304b4f2d5de8';
const url = `http://localhost:3000/api/revalidate?secret=${secret}&path=/&type=layout`;

fetch(url, { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log('Revalidation response:', data))
  .catch(err => console.error('Error:', err));

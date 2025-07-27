---
id: "huffman-lossless-compression"
title: "Huffman Compression algorithm"
description: "A beginner-friendly explanation and Python implementation of the Huffman compression algorithm. Covers both encoding and decoding steps, explains the underlying logic, and shows how compression works using binary trees and frequency mapping."
date: "2017-10-17"
tag: "science"
read_time: "6 min read"
featured: false
---

Hello everyone!
This time I wrote scripts to compress text files based on Huffman compression algorithm. And yes, it really compresses text files and we all know how much applications does compression have in real world. As always, every code that I write here will be in python, and written in very easy way. I hope its clear enough for you all to understand!

Firstly lets understand the intuition behind the algorithm. Every data type that we use in language for example, int, they all have certain size associated with them. For example int generally has a size of 4, double a size of 8, character a size of 1 and so on. These numerical values representing the size, indicates the number of bytes they take up on the memory. Each byte is of 8 bits. So an int data type takes 32 bits of memory. For a reminder, a bit is just a on or off signal for the computer. Everything that we use in computers are just a combination of 1s(on) and 0s(off).

Every text that we use is of ASCII encoding format. For more details you can refer wikipedia page. In Huffman algorithm we exploit two facts:

* ASCII format contains 128 different characters.
* Frequency of characters in a given text varies. Sometimes a lot.

Lets say a text is “zippy hippy deny meni”. Clearly this text contains a lot of ‘p’. ASCII code for ‘p’ is 112. Binary representation is ‘11100000’. So each ‘p’ occurrence in the text uses one byte of memory. This utilizes lot of space unnecessarily. What we do is, we take the frequency of all the characters of the text, and assign our own binary representation for characters. More the occurrence of a character in the text, shorter binary representation for that character. Pretty cool isn’t?

### How is the idea implemented?

That is the main question. In my implementation of the above idea, I have split it into two modules. One for encoding the data, other for decoding. It uses binary tree data structure so you might want to brush it up in case you have forgotten.

Lets begin with encoding.

#### Algorithm

1. We create a single node binary tree. The key is the character and value of the node is the frequency of character occurring in the tree.
2. Store these trees in ascending order of value(frequency) in a list.
3. Repeatedly pop the last two trees and combine them into one, with their parent value as the sum of frequency and its left and right node as the original tree nodes.
4. Adjust the list in a sorted manner accordingly.
5. Repeat step 3 and 4 till only one tree is left.

This will create a so called encoding tree. If we think of left as 0 and right as 1 and begin traversing from root, each leaf node will represent a new binary value for a character. Note that every leaf is a tree with key as the character. Larger frequency value of nodes have shorter path. This forms the basis of encoding our data into its representation.

Next part of challenge is to find each path of the leaf node and then save it in dictionary(hash map). Now if you think about it a bit, you will notice that the binary tree is a full binary tree, meaning a node is either a leaf, or has two children or is a root. Also as noted earlier, every leaf node is the character. To reach a particular leaf node from root, we follow a path, which will always be unique. We represent them with 0s and 1s as mentioned above. The reason for this is, since every character encoding could be of arbitrary length, we cannot split the string into particular length and parse it. Using a binary tree, we will know when it is suppose to end by the leaf node.
To find path of leaf nodes, we write a recursive function.

```python
def _find_path(tree, path):
     if type(tree.key) == str:
         return [tree.key, ''.join(path)]

     left = self._path_leaf(tree.left, path+'0')
     right = self._path_leaf(tree.right, path+'1')

     ans = []
     ans.extend(left)
     ans.extend(right)

     return ans
```

Take a minute to look and understand it. These are best explained when you think about it! 😀

Now after finding the paths of each character and storing it in a list, we can easily convert it into a dictionary.

```python
def _create_dict(self, ans):
    temp_dict = {}
    for x in xrange(0,len(ans),2):
         temp_dict[ans[x]] = ans[x+1]

    return temp_dict
```

Following the above recursive function, we get a list with character at even index and frequency at odd index. We simply save it in a dictionary.

Next part is to convert the original string that we wish to compress, into a string of 0s and 1s using the dictionary that we just created. These 0s and 1s will then become the bits of single byte. This byte is then written into file.
To write bits in byte, we use bitarray library of python. Since implementation will be different for different users, I will not go into details and leave a task for you. If anyone gets stuck anywhere, please feel free to contact me!

### Decoding

Decoding involves retrieving the original text from the compressed file using a meta file(the tree we created above) as a source. We can directly somehow use the created tree object in our decode program, or we can save the dictionary values in a file and re-create the tree. Former method will occupy a lot of space, since tree is a custom data type. Latter will involve re-creating a tree, but since creating tree is relatively fast considering a small input(Note that the characters to be encoded will be less, since most of the characters involves alphabets and numbers) we will use the second method.

Challenge is to read individual bits from a byte. File.read() method reads only a single byte. Here we will take the help of bit operators, particularly arithmetic right shift operator(>>).

```python
def _get_bits(self, f):

    byte = (ord(x) for x in f.read())
    for x in byte:
        for i in xrange(8):
            yield (x >> i) & 1
```

The arithmetic right shift operator right shits by i position. The operator pads with the most significant bit of the number. Say if a binary number is 101(5). 5>>1, will give 110. Performing the & operation with one, 110 & 100 will give 0. Therefore we successfully extracted the second bit of the binary string. We continue to do this till 8 iterations to extract 8 bits of every character. Here yield is a python keyword which is similar to return, but differs in the sense that after returning a value it will continue to return from that point this loop ends.

After extracting the bits, we can construct the tree from the meta file, and traverse the tree till we reach a leaf node and write the value in a string to give the final output. Here is the code snippet to traverse the tree.

```python
length = len(self.binary_bits)
index = 0

while index < length:
    if temp.key != None:
         original += temp.key
         temp = self.meta
         continue

    if self.binary_bits[index] == '1':
         temp = temp.right

    else:
         temp = temp.left

    index += 1
```

That’s about it. The rest would involve to make it more functional by using a class. Here I wrote down the main algorithm and designing part of Huffman implementation. If you want to see the whole working code, you check my github repo and use it.

I hope you learnt something new, atleast 10% of what I said. If you found it interesting then go ahead and try it for yourself. You can share your implementation here. Thank you for reading and as always I am open to questions and feedback!

(seq
 (call relay ("op" "identity") [])
 (seq
  (call relay (userlist "join")
        [user] result)
  (call %init_peer_id% (returnService "") [result])
     ))
